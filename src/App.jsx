import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ─── Constants ───
const COLORS = [
  "#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899",
  "#06B6D4","#F97316","#14B8A6","#6366F1","#D946EF","#84CC16",
  "#0EA5E9","#E11D48","#22C55E","#FACC15","#A855F7","#FB923C",
  "#2DD4BF","#818CF8",
];
const DEFAULT_TIME_SLOTS = ["09:00","11:00","13:00","15:00","17:00","19:00"];
const uid = () => Math.random().toString(36).slice(2, 9);
const dayLabel = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const addDays = (s, n) => { const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

// ─── Dark mode hook ───
function useDarkMode() {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark(d => !d);
  return [dark, toggle];
}

function t(dark) {
  return {
    bg: dark ? "#111827" : "#F3F4F6",
    card: dark ? "#1F2937" : "#fff",
    cardBorder: dark ? "#374151" : "#E5E7EB",
    text: dark ? "#F9FAFB" : "#111827",
    textMuted: dark ? "#9CA3AF" : "#6B7280",
    inputBg: dark ? "#374151" : "#fff",
    inputBorder: dark ? "#4B5563" : "#D1D5DB",
    rowBg: dark ? "#1F2937" : "#F9FAFB",
    rowAlt: dark ? "#111827" : "#fff",
    headerBg: dark ? "linear-gradient(135deg,#1E3A5F,#4C1D95)" : "linear-gradient(135deg,#1E40AF,#7C3AED)",
    tabBg: dark ? "#1F2937" : "#fff",
    tabActive: dark ? "#60A5FA" : "#3B82F6",
    highlight: dark ? "#374151" : "#EFF6FF",
    warning: dark ? "#78350F" : "#FEF3C7",
    warningBorder: dark ? "#F59E0B" : "#F59E0B",
  };
}

// ─── Schedule Optimizer ───
function optimizeSchedule(teams, venues, config, rivalries) {
  const { startDate, gamesPerDay, minRestDays, balanceHomeAway, roundRobin, blackoutDates, divisions } = config;
  if (teams.length < 2) return { error: "Need at least 2 teams." };
  if (venues.length < 1) return { error: "Need at least 1 venue." };

  const venueSlots = {};
  venues.forEach(v => { venueSlots[v.id] = v.timeSlots && v.timeSlots.length > 0 ? v.timeSlots : ["15:00"]; });

  const teamDiv = {};
  if (divisions.length > 0) {
    divisions.forEach(div => div.teamIds.forEach(tid => { teamDiv[tid] = div.id; }));
  }

  let matchups = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const sameDivision = teamDiv[teams[i].id] && teamDiv[teams[i].id] === teamDiv[teams[j].id];
      let count = roundRobin === "double" ? 2 : 1;
      if (sameDivision && divisions.length > 0) count = roundRobin === "double" ? 4 : 2;
      for (let k = 0; k < count; k++) {
        if (k % 2 === 0) matchups.push({ home: teams[i].id, away: teams[j].id, rivalry: false });
        else matchups.push({ home: teams[j].id, away: teams[i].id, rivalry: false });
      }
    }
  }

  // Mark rivalries
  const rivalrySet = new Set();
  (rivalries || []).forEach(r => {
    rivalrySet.add(`${r.team1}-${r.team2}`);
    rivalrySet.add(`${r.team2}-${r.team1}`);
  });
  matchups.forEach(m => {
    if (rivalrySet.has(`${m.home}-${m.away}`)) m.rivalry = true;
  });

  // Sort: rivalries first (prime scheduling), then shuffle rest
  const rivalryGames = matchups.filter(m => m.rivalry);
  const normalGames = matchups.filter(m => !m.rivalry);
  for (let i = normalGames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [normalGames[i], normalGames[j]] = [normalGames[j], normalGames[i]];
  }
  matchups = [...rivalryGames, ...normalGames];

  const blackoutSet = new Set(blackoutDates || []);
  const teamBlackouts = {};
  teams.forEach(tm => { teamBlackouts[tm.id] = new Set(tm.blackoutDates || []); });
  const venueBlackouts = {};
  venues.forEach(v => { venueBlackouts[v.id] = new Set(v.blackoutDates || []); });

  const schedule = [];
  const teamLastPlayed = {};
  const homeCount = {};
  const awayCount = {};
  teams.forEach(tm => { teamLastPlayed[tm.id] = -999; homeCount[tm.id] = 0; awayCount[tm.id] = 0; });

  let dayIndex = 0;
  const maxDays = Math.ceil(matchups.length / Math.max(1, Math.min(gamesPerDay, venues.length))) * 4;
  const remaining = [...matchups];

  while (remaining.length > 0 && dayIndex < maxDays) {
    const date = addDays(startDate, dayIndex);
    if (blackoutSet.has(date)) { dayIndex++; continue; }

    let slotsUsed = 0;
    const venueSlotUsed = {};
    const teamsPlayingToday = new Set();

    for (let i = 0; i < remaining.length && slotsUsed < gamesPerDay; i++) {
      const m = remaining[i];
      if (dayIndex - teamLastPlayed[m.home] < minRestDays + 1 || dayIndex - teamLastPlayed[m.away] < minRestDays + 1) continue;
      if (teamsPlayingToday.has(m.home) || teamsPlayingToday.has(m.away)) continue;
      if (teamBlackouts[m.home]?.has(date) || teamBlackouts[m.away]?.has(date)) continue;

      let home = m.home, away = m.away;
      if (balanceHomeAway) {
        const hI = homeCount[home] - awayCount[home];
        const aI = homeCount[away] - awayCount[away];
        if (hI > aI + 1) [home, away] = [away, home];
      }

      // Find venue + time slot
      let assignedVenue = null, assignedTime = null;
      const homeTeam = teams.find(tm => tm.id === home);
      const venueOrder = [...venues];
      if (homeTeam?.preferredVenue) {
        const pIdx = venueOrder.findIndex(v => v.id === homeTeam.preferredVenue);
        if (pIdx > 0) { const [pv] = venueOrder.splice(pIdx, 1); venueOrder.unshift(pv); }
      }
      for (const v of venueOrder) {
        if (venueBlackouts[v.id]?.has(date)) continue;
        const slots = venueSlots[v.id] || ["15:00"];
        if (!venueSlotUsed[v.id]) venueSlotUsed[v.id] = new Set();
        for (const slot of slots) {
          if (!venueSlotUsed[v.id].has(slot)) {
            assignedVenue = v.id;
            assignedTime = slot;
            break;
          }
        }
        if (assignedVenue) break;
      }
      if (!assignedVenue) continue;

      venueSlotUsed[assignedVenue].add(assignedTime);
      schedule.push({ id: uid(), home, away, venue: assignedVenue, date, time: assignedTime, dayIndex, rivalry: m.rivalry });
      teamsPlayingToday.add(home);
      teamsPlayingToday.add(away);
      teamLastPlayed[home] = dayIndex;
      teamLastPlayed[away] = dayIndex;
      homeCount[home]++;
      awayCount[away]++;
      remaining.splice(i, 1);
      i--;
      slotsUsed++;
    }
    dayIndex++;
  }

  if (remaining.length > 0) {
    return { games: schedule, warning: `${remaining.length} game(s) couldn't be scheduled. Try adding venues, time slots, or reducing rest days.` };
  }
  return { games: schedule };
}

// ─── Playoff Bracket Generator ───
function generatePlayoffBracket(teams, seedByRecord) {
  if (teams.length < 2) return [];
  let size = 2;
  while (size < teams.length) size *= 2;
  const seeded = seedByRecord ? [...teams] : [...teams].sort(() => Math.random() - 0.5);
  const padded = [...seeded];
  while (padded.length < size) padded.push({ id: "bye-" + uid(), name: "BYE", color: "#9CA3AF", isBye: true });

  const rounds = [];
  let currentRound = [];
  for (let i = 0; i < padded.length; i += 2) {
    currentRound.push({ team1: padded[i], team2: padded[i + 1], winner: null });
  }
  rounds.push(currentRound);

  // Auto-advance byes
  currentRound.forEach(match => {
    if (match.team2.isBye) match.winner = match.team1.id;
    else if (match.team1.isBye) match.winner = match.team2.id;
  });

  while (currentRound.length > 1) {
    const next = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      next.push({ team1: null, team2: null, winner: null });
    }
    rounds.push(next);
    currentRound = next;
  }
  return rounds;
}

// ─── UI Components ───
function Badge({ color, children, dark, small, glow }) {
  return (
    <span style={{
      background: color || "#6B7280", color: "#fff",
      padding: small ? "1px 7px" : "2px 10px", borderRadius: 9999,
      fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap",
      boxShadow: glow ? `0 0 8px ${color}66` : "none",
    }}>{children}</span>
  );
}

function Card({ children, theme, style }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, color: theme.text, ...style }}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", style, disabled }) {
  const base = { padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s" };
  const variants = {
    primary: { background: "#3B82F6", color: "#fff" },
    success: { background: "#10B981", color: "#fff" },
    danger: { background: "#EF4444", color: "#fff" },
    ghost: { background: "transparent", color: "#3B82F6", border: "1px solid #D1D5DB" },
    warning: { background: "#F59E0B", color: "#fff" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style, type = "text", theme }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme?.inputBorder || "#D1D5DB"}`,
        fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
        background: theme?.inputBg || "#fff", color: theme?.text || "#111", ...style }} />
  );
}

function Select({ value, onChange, children, style, theme }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme?.inputBorder || "#D1D5DB"}`,
        fontSize: 14, outline: "none", background: theme?.inputBg || "#fff", color: theme?.text || "#111", ...style }}>
      {children}
    </select>
  );
}

// ─── Tab: Venues ───
function VenuesTab({ venues, setVenues, theme }) {
  const [name, setName] = useState("");
  const [editingSlots, setEditingSlots] = useState(null);
  const [slotInput, setSlotInput] = useState("");
  const [blackoutInput, setBlackoutInput] = useState("");

  const add = () => {
    if (!name.trim()) return;
    setVenues([...venues, { id: uid(), name: name.trim(), timeSlots: ["15:00","17:00","19:00"], blackoutDates: [] }]);
    setName("");
  };

  const updateVenue = (id, field, val) => setVenues(venues.map(v => v.id === id ? { ...v, [field]: val } : v));

  const addSlot = (vid) => {
    if (!slotInput) return;
    const v = venues.find(x => x.id === vid);
    if (v && !v.timeSlots.includes(slotInput)) {
      updateVenue(vid, "timeSlots", [...v.timeSlots, slotInput].sort());
    }
    setSlotInput("");
  };

  const addBlackout = (vid) => {
    if (!blackoutInput) return;
    const v = venues.find(x => x.id === vid);
    if (v && !v.blackoutDates.includes(blackoutInput)) {
      updateVenue(vid, "blackoutDates", [...v.blackoutDates, blackoutInput].sort());
    }
    setBlackoutInput("");
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Venues</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Input value={name} onChange={setName} placeholder="Venue name" style={{ flex: 1 }} theme={theme} />
        <Button onClick={add}>+ Add</Button>
      </div>
      {venues.length === 0 && <p style={{ color: theme.textMuted, textAlign: "center", padding: 24 }}>No venues yet. Add your first venue above.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {venues.map(v => (
          <div key={v.id} style={{ background: theme.rowBg, padding: 14, borderRadius: 10, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="ghost" onClick={() => setEditingSlots(editingSlots === v.id ? null : v.id)} style={{ fontSize: 12, padding: "4px 10px" }}>
                  {editingSlots === v.id ? "Done" : "Edit"}
                </Button>
                <button onClick={() => setVenues(venues.filter(x => x.id !== v.id))}
                  style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>×</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: theme.textMuted, marginRight: 4 }}>Time slots:</span>
              {(v.timeSlots || []).map(s => (
                <span key={s} style={{ fontSize: 12, background: "#3B82F622", color: "#3B82F6", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  {s}
                  {editingSlots === v.id && <button onClick={() => updateVenue(v.id, "timeSlots", v.timeSlots.filter(x => x !== s))}
                    style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>×</button>}
                </span>
              ))}
            </div>
            {editingSlots === v.id && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Input type="time" value={slotInput} onChange={setSlotInput} theme={theme} style={{ width: 140 }} />
                  <Button onClick={() => addSlot(v.id)} style={{ fontSize: 12, padding: "4px 10px" }}>+ Slot</Button>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: theme.textMuted }}>Blackout dates:</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0" }}>
                    {(v.blackoutDates || []).map(d => (
                      <span key={d} style={{ fontSize: 11, background: "#EF444422", color: "#EF4444", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        {d}
                        <button onClick={() => updateVenue(v.id, "blackoutDates", v.blackoutDates.filter(x => x !== d))}
                          style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input type="date" value={blackoutInput} onChange={setBlackoutInput} theme={theme} style={{ width: 160 }} />
                    <Button variant="danger" onClick={() => addBlackout(v.id)} style={{ fontSize: 12, padding: "4px 10px" }}>+ Blackout</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Teams ───
function TeamsTab({ teams, setTeams, venues, theme }) {
  const [name, setName] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [blackoutInput, setBlackoutInput] = useState("");

  const add = () => {
    if (!name.trim()) return;
    setTeams([...teams, { id: uid(), name: name.trim(), color: COLORS[teams.length % COLORS.length], preferredVenue: "", blackoutDates: [], wins: 0, losses: 0 }]);
    setName("");
  };
  const update = (id, f, v) => setTeams(teams.map(tm => tm.id === id ? { ...tm, [f]: v } : tm));

  const addBlackout = (tid) => {
    if (!blackoutInput) return;
    const tm = teams.find(x => x.id === tid);
    if (tm && !(tm.blackoutDates || []).includes(blackoutInput)) {
      update(tid, "blackoutDates", [...(tm.blackoutDates || []), blackoutInput].sort());
    }
    setBlackoutInput("");
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Teams</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Input value={name} onChange={setName} placeholder="Team name" style={{ flex: 1 }} theme={theme} />
        <Button onClick={add}>+ Add</Button>
      </div>
      {teams.length === 0 && <p style={{ color: theme.textMuted, textAlign: "center", padding: 24 }}>No teams yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {teams.map(tm => (
          <div key={tm.id} style={{ background: theme.rowBg, padding: "10px 14px", borderRadius: 8, borderLeft: `4px solid ${tm.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={tm.color} onChange={e => update(tm.id, "color", e.target.value)}
                style={{ width: 24, height: 24, border: "none", cursor: "pointer", padding: 0, background: "none" }} />
              <span style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>{tm.name}</span>
              <Select value={tm.preferredVenue} onChange={v => update(tm.id, "preferredVenue", v)} theme={theme} style={{ fontSize: 12, width: 140 }}>
                <option value="">No home venue</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
              <Button variant="ghost" onClick={() => setEditingTeam(editingTeam === tm.id ? null : tm.id)} style={{ fontSize: 11, padding: "3px 8px" }}>
                {editingTeam === tm.id ? "Done" : "..."}
              </Button>
              <button onClick={() => setTeams(teams.filter(x => x.id !== tm.id))}
                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>×</button>
            </div>
            {editingTeam === tm.id && (
              <div style={{ marginTop: 8, paddingLeft: 34 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: theme.textMuted }}>Record (W-L):</span>
                  <Input type="number" value={tm.wins || 0} onChange={v => update(tm.id, "wins", +v)} theme={theme} style={{ width: 60 }} />
                  <span>-</span>
                  <Input type="number" value={tm.losses || 0} onChange={v => update(tm.id, "losses", +v)} theme={theme} style={{ width: 60 }} />
                </div>
                <span style={{ fontSize: 12, color: theme.textMuted }}>Blackout dates:</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "4px 0" }}>
                  {(tm.blackoutDates || []).map(d => (
                    <span key={d} style={{ fontSize: 11, background: "#EF444422", color: "#EF4444", padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                      {d}<button onClick={() => update(tm.id, "blackoutDates", tm.blackoutDates.filter(x => x !== d))}
                        style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Input type="date" value={blackoutInput} onChange={setBlackoutInput} theme={theme} style={{ width: 150 }} />
                  <Button variant="danger" onClick={() => addBlackout(tm.id)} style={{ fontSize: 11, padding: "3px 8px" }}>+ Blackout</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Divisions & Rivalries ───
function DivisionsTab({ teams, divisions, setDivisions, rivalries, setRivalries, theme }) {
  const [divName, setDivName] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");

  const addDiv = () => {
    if (!divName.trim()) return;
    setDivisions([...divisions, { id: uid(), name: divName.trim(), teamIds: [] }]);
    setDivName("");
  };

  const toggleTeamInDiv = (divId, teamId) => {
    setDivisions(divisions.map(d => {
      if (d.id !== divId) return d.teamIds.includes(teamId) ? { ...d, teamIds: d.teamIds.filter(x => x !== teamId) } : d;
      return d.teamIds.includes(teamId) ? { ...d, teamIds: d.teamIds.filter(x => x !== teamId) } : { ...d, teamIds: [...d.teamIds, teamId] };
    }));
  };

  const addRivalry = () => {
    if (!r1 || !r2 || r1 === r2) return;
    if (rivalries.some(r => (r.team1 === r1 && r.team2 === r2) || (r.team1 === r2 && r.team2 === r1))) return;
    setRivalries([...rivalries, { team1: r1, team2: r2 }]);
    setR1(""); setR2("");
  };

  const assignedTeams = new Set(divisions.flatMap(d => d.teamIds));

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Divisions / Conferences</h3>
      <p style={{ fontSize: 13, color: theme.textMuted, margin: "0 0 12px" }}>Teams in the same division play each other more often.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Input value={divName} onChange={setDivName} placeholder="Division name" style={{ flex: 1 }} theme={theme} />
        <Button onClick={addDiv}>+ Add Division</Button>
      </div>
      {divisions.map(d => (
        <div key={d.id} style={{ marginBottom: 14, padding: 12, background: theme.rowBg, borderRadius: 8, border: `1px solid ${theme.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700 }}>{d.name} ({d.teamIds.length} teams)</span>
            <button onClick={() => setDivisions(divisions.filter(x => x.id !== d.id))}
              style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {teams.map(tm => {
              const inThis = d.teamIds.includes(tm.id);
              const inOther = !inThis && assignedTeams.has(tm.id);
              return (
                <button key={tm.id} onClick={() => !inOther && toggleTeamInDiv(d.id, tm.id)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: inOther ? "not-allowed" : "pointer",
                    border: inThis ? `2px solid ${tm.color}` : "1px solid #D1D5DB",
                    background: inThis ? tm.color + "22" : "transparent",
                    color: inOther ? "#D1D5DB" : theme.text, opacity: inOther ? 0.4 : 1,
                  }}>{tm.name}</button>
              );
            })}
          </div>
        </div>
      ))}

      <h3 style={{ margin: "24px 0 12px", fontSize: 18 }}>Rivalries</h3>
      <p style={{ fontSize: 13, color: theme.textMuted, margin: "0 0 12px" }}>Rivalry games get priority scheduling (scheduled first).</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Select value={r1} onChange={setR1} theme={theme} style={{ width: 160 }}>
          <option value="">Team 1...</option>
          {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </Select>
        <span style={{ alignSelf: "center", fontWeight: 700, color: theme.textMuted }}>vs</span>
        <Select value={r2} onChange={setR2} theme={theme} style={{ width: 160 }}>
          <option value="">Team 2...</option>
          {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </Select>
        <Button variant="warning" onClick={addRivalry}>+ Rivalry</Button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {rivalries.map((r, i) => {
          const t1 = teams.find(tm => tm.id === r.team1);
          const t2 = teams.find(tm => tm.id === r.team2);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#F59E0B22", borderRadius: 8, border: "1px solid #F59E0B44" }}>
              <Badge color={t1?.color} small>{t1?.name}</Badge>
              <span style={{ fontSize: 11, color: theme.textMuted }}>vs</span>
              <Badge color={t2?.color} small>{t2?.name}</Badge>
              <button onClick={() => setRivalries(rivalries.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: 0 }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Configure ───
function ConfigTab({ teams, venues, config, setConfig, onGenerate, divisions, theme }) {
  const totalBase = (teams.length * (teams.length - 1)) / 2;
  const multiplier = config.roundRobin === "double" ? 2 : 1;
  let extraDiv = 0;
  if (divisions.length > 0) {
    divisions.forEach(d => {
      const n = d.teamIds.length;
      extraDiv += (n * (n - 1)) / 2 * multiplier;
    });
  }
  const totalGames = totalBase * multiplier + extraDiv;

  const addGlobalBlackout = (date) => {
    if (date && !(config.blackoutDates || []).includes(date)) {
      setConfig({ ...config, blackoutDates: [...(config.blackoutDates || []), date].sort() });
    }
  };

  const [bdInput, setBdInput] = useState("");

  return (
    <div>
      <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Schedule Settings</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Start Date</label>
          <Input type="date" value={config.startDate} onChange={v => setConfig({ ...config, startDate: v })} theme={theme} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Max Games Per Day</label>
          <Input type="number" value={config.gamesPerDay} onChange={v => setConfig({ ...config, gamesPerDay: Math.max(1, +v) })} theme={theme} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Min Rest Days Between Games</label>
          <Input type="number" value={config.minRestDays} onChange={v => setConfig({ ...config, minRestDays: Math.max(0, +v) })} theme={theme} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Round Robin</label>
          <Select value={config.roundRobin} onChange={v => setConfig({ ...config, roundRobin: v })} theme={theme} style={{ width: "100%" }}>
            <option value="single">Single (each pair once)</option>
            <option value="double">Double (home & away)</option>
          </Select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}>
          <input type="checkbox" checked={config.balanceHomeAway} onChange={e => setConfig({ ...config, balanceHomeAway: e.target.checked })} />
          <label style={{ fontSize: 14 }}>Balance home/away games for each team</label>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Global Blackout Dates</label>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {(config.blackoutDates || []).map(d => (
            <span key={d} style={{ fontSize: 11, background: "#EF444422", color: "#EF4444", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
              {d}<button onClick={() => setConfig({ ...config, blackoutDates: config.blackoutDates.filter(x => x !== d) })}
                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <Input type="date" value={bdInput} onChange={setBdInput} theme={theme} style={{ width: 160 }} />
          <Button variant="danger" onClick={() => { addGlobalBlackout(bdInput); setBdInput(""); }} style={{ fontSize: 12 }}>+ Blackout</Button>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: theme.highlight, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 14 }}>
          <strong>{teams.length}</strong> teams · <strong>{venues.length}</strong> venues · <strong>~{totalGames}</strong> games
        </div>
        <Button variant="success" onClick={onGenerate} disabled={teams.length < 2 || venues.length < 1} style={{ fontSize: 16, padding: "10px 28px" }}>
          Generate Schedule
        </Button>
      </div>
    </div>
  );
}

// ─── Tab: Schedule View ───
function ScheduleTab({ games, setGames, teams, venues, warning, theme }) {
  const [view, setView] = useState("calendar");
  const [teamFilter, setTeamFilter] = useState("");
  const [swapSource, setSwapSource] = useState(null);

  const teamMap = useMemo(() => Object.fromEntries(teams.map(tm => [tm.id, tm])), [teams]);
  const venueMap = useMemo(() => Object.fromEntries(venues.map(v => [v.id, v])), [venues]);

  const filtered = useMemo(() => {
    if (!teamFilter) return games;
    return games.filter(g => g.home === teamFilter || g.away === teamFilter);
  }, [games, teamFilter]);

  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach(g => { if (!map[g.date]) map[g.date] = []; map[g.date].push(g); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Conflict detection
  const conflicts = useMemo(() => {
    const set = new Set();
    const byDateAll = {};
    games.forEach(g => { if (!byDateAll[g.date]) byDateAll[g.date] = []; byDateAll[g.date].push(g); });
    Object.values(byDateAll).forEach(dayGames => {
      for (let i = 0; i < dayGames.length; i++) {
        for (let j = i + 1; j < dayGames.length; j++) {
          const a = dayGames[i], b = dayGames[j];
          if (a.venue === b.venue && a.time === b.time) { set.add(a.id); set.add(b.id); }
          if (a.home === b.home || a.home === b.away || a.away === b.home || a.away === b.away) { set.add(a.id); set.add(b.id); }
        }
      }
    });
    return set;
  }, [games]);

  // Stats
  const stats = useMemo(() => {
    const s = {};
    teams.forEach(tm => { s[tm.id] = { home: 0, away: 0, total: 0, opponents: {} }; });
    games.forEach(g => {
      if (s[g.home]) { s[g.home].home++; s[g.home].total++; s[g.home].opponents[g.away] = (s[g.home].opponents[g.away] || 0) + 1; }
      if (s[g.away]) { s[g.away].away++; s[g.away].total++; s[g.away].opponents[g.home] = (s[g.away].opponents[g.home] || 0) + 1; }
    });
    return s;
  }, [games, teams]);

  // Venue utilization
  const venueUtil = useMemo(() => {
    const u = {};
    venues.forEach(v => { u[v.id] = 0; });
    games.forEach(g => { if (u[g.venue] !== undefined) u[g.venue]++; });
    return u;
  }, [games, venues]);

  // Strength of schedule
  const sos = useMemo(() => {
    const s = {};
    teams.forEach(tm => {
      const opps = stats[tm.id]?.opponents || {};
      let totalOppWins = 0, totalOppGames = 0;
      Object.keys(opps).forEach(oId => {
        const opp = teams.find(x => x.id === oId);
        if (opp) { totalOppWins += (opp.wins || 0); totalOppGames += (opp.wins || 0) + (opp.losses || 0); }
      });
      s[tm.id] = totalOppGames > 0 ? (totalOppWins / totalOppGames) : 0;
    });
    return s;
  }, [teams, stats]);

  const handleSwap = (game) => {
    if (!swapSource) { setSwapSource(game.id); return; }
    if (swapSource === game.id) { setSwapSource(null); return; }
    // Swap dates, times, venues
    setGames(games.map(g => {
      if (g.id === swapSource) {
        const target = games.find(x => x.id === game.id);
        return { ...g, date: target.date, time: target.time, venue: target.venue, dayIndex: target.dayIndex };
      }
      if (g.id === game.id) {
        const source = games.find(x => x.id === swapSource);
        return { ...g, date: source.date, time: source.time, venue: source.venue, dayIndex: source.dayIndex };
      }
      return g;
    }));
    setSwapSource(null);
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [["Date","Time","Home","Away","Venue","Rivalry"]];
    games.forEach(g => rows.push([g.date, g.time || "", teamMap[g.home]?.name, teamMap[g.away]?.name, venueMap[g.venue]?.name, g.rivalry ? "Yes" : ""]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "schedule.csv"; a.click();
  };

  // Export ICS
  const exportICS = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SportsScheduler//EN"];
    games.forEach(g => {
      const dt = g.date.replace(/-/g, "") + "T" + (g.time || "15:00").replace(":", "") + "00";
      const endH = parseInt((g.time || "15:00").split(":")[0]) + 2;
      const endDt = g.date.replace(/-/g, "") + "T" + String(endH).padStart(2, "0") + (g.time || "15:00").split(":")[1] + "00";
      lines.push("BEGIN:VEVENT", `DTSTART:${dt}`, `DTEND:${endDt}`,
        `SUMMARY:${teamMap[g.home]?.name} vs ${teamMap[g.away]?.name}`,
        `LOCATION:${venueMap[g.venue]?.name || "TBD"}`,
        `DESCRIPTION:${g.rivalry ? "RIVALRY GAME - " : ""}${teamMap[g.home]?.name} (Home) vs ${teamMap[g.away]?.name} (Away)`,
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "schedule.ics"; a.click();
  };

  // Shareable link
  const shareLink = () => {
    const data = { teams: teams.map(tm => ({ n: tm.name, c: tm.color })), venues: venues.map(v => v.name), games: games.map(g => ({ h: teams.findIndex(tm => tm.id === g.home), a: teams.findIndex(tm => tm.id === g.away), v: venues.findIndex(v => v.id === g.venue), d: g.date, t: g.time })) };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = window.location.href.split("?")[0] + "?schedule=" + encoded;
    navigator.clipboard?.writeText(url);
    alert("Schedule link copied to clipboard!");
  };

  if (games.length === 0) return <p style={{ color: theme.textMuted, textAlign: "center", padding: 40 }}>No schedule yet. Generate one from the Configure tab.</p>;

  const maxVenueGames = Math.max(...Object.values(venueUtil), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Schedule ({filtered.length}{teamFilter ? ` of ${games.length}` : ""} games, {byDate.length} days)</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["calendar","stats","venues","sos"].map(v => (
            <Button key={v} variant={view === v ? "primary" : "ghost"} onClick={() => setView(v)} style={{ fontSize: 12, padding: "5px 12px" }}>
              {v === "calendar" ? "Calendar" : v === "stats" ? "Stats" : v === "venues" ? "Venues" : "Strength"}
            </Button>
          ))}
        </div>
      </div>

      {/* Team filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: theme.textMuted }}>Filter:</span>
        <button onClick={() => setTeamFilter("")}
          style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, border: !teamFilter ? "2px solid #3B82F6" : "1px solid #D1D5DB",
            background: !teamFilter ? "#3B82F622" : "transparent", cursor: "pointer", color: theme.text }}>All</button>
        {teams.map(tm => (
          <button key={tm.id} onClick={() => setTeamFilter(teamFilter === tm.id ? "" : tm.id)}
            style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", color: theme.text,
              border: teamFilter === tm.id ? `2px solid ${tm.color}` : "1px solid #D1D5DB",
              background: teamFilter === tm.id ? tm.color + "22" : "transparent" }}>{tm.name}</button>
        ))}
      </div>

      {/* Export bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={exportCSV} style={{ fontSize: 12, padding: "4px 12px" }}>Export CSV</Button>
        <Button variant="ghost" onClick={exportICS} style={{ fontSize: 12, padding: "4px 12px" }}>Export .ics (Calendar)</Button>
        <Button variant="ghost" onClick={() => window.print()} style={{ fontSize: 12, padding: "4px 12px" }}>Print / PDF</Button>
        <Button variant="ghost" onClick={shareLink} style={{ fontSize: 12, padding: "4px 12px" }}>Copy Share Link</Button>
      </div>

      {warning && <div style={{ background: theme.warning, border: `1px solid ${theme.warningBorder}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 }}>{warning}</div>}

      {swapSource && <div style={{ background: "#3B82F622", border: "1px solid #3B82F6", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>Click another game to swap schedules. <button onClick={() => setSwapSource(null)} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontWeight: 700 }}>Cancel</button></div>}

      {/* Calendar View */}
      {view === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {byDate.map(([date, dayGames]) => (
            <div key={date}>
              <div style={{ fontWeight: 700, fontSize: 14, color: theme.textMuted, marginBottom: 8 }}>{dayLabel(date)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dayGames.map(g => {
                  const isConflict = conflicts.has(g.id);
                  const isSwapSrc = swapSource === g.id;
                  return (
                    <div key={g.id} onClick={() => handleSwap(g)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                        background: isConflict ? "#FEE2E2" : isSwapSrc ? "#DBEAFE" : theme.rowBg,
                        borderRadius: 8, fontSize: 14, cursor: "pointer",
                        border: isConflict ? "2px solid #EF4444" : isSwapSrc ? "2px solid #3B82F6" : `1px solid ${theme.cardBorder}`,
                        transition: "all 0.15s",
                      }}>
                      <span style={{ fontSize: 12, color: theme.textMuted, minWidth: 44 }}>{g.time || ""}</span>
                      <Badge color={teamMap[g.home]?.color}>{teamMap[g.home]?.name}</Badge>
                      <span style={{ color: theme.textMuted, fontWeight: 600 }}>vs</span>
                      <Badge color={teamMap[g.away]?.color}>{teamMap[g.away]?.name}</Badge>
                      {g.rivalry && <span style={{ fontSize: 10, background: "#F59E0B", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>RIVALRY</span>}
                      {isConflict && <span style={{ fontSize: 10, background: "#EF4444", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>CONFLICT</span>}
                      <span style={{ marginLeft: "auto", color: theme.textMuted, fontSize: 12 }}>@ {venueMap[g.venue]?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats View */}
      {view === "stats" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.cardBorder}` }}>
                {["Team","Home","Away","Total","Balance"].map(h => <th key={h} style={{ textAlign: h === "Team" || h === "Balance" ? "left" : "center", padding: 10 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {teams.map(tm => {
                const s = stats[tm.id] || { home: 0, away: 0, total: 0 };
                const diff = s.home - s.away;
                return (
                  <tr key={tm.id} style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    <td style={{ padding: 10 }}><Badge color={tm.color}>{tm.name}</Badge></td>
                    <td style={{ textAlign: "center", padding: 10 }}>{s.home}</td>
                    <td style={{ textAlign: "center", padding: 10 }}>{s.away}</td>
                    <td style={{ textAlign: "center", padding: 10, fontWeight: 600 }}>{s.total}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 8, background: theme.cardBorder, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${s.total > 0 ? (s.home / s.total) * 100 : 50}%`, height: "100%", background: Math.abs(diff) <= 1 ? "#10B981" : "#F59E0B", borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, color: Math.abs(diff) <= 1 ? "#10B981" : "#F59E0B" }}>
                          {diff === 0 ? "Even" : diff > 0 ? `+${diff} home` : `+${Math.abs(diff)} away`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Venue Utilization */}
      {view === "venues" && (
        <div>
          <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Venue Utilization</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {venues.map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, width: 140, flexShrink: 0 }}>{v.name}</span>
                <div style={{ flex: 1, height: 24, background: theme.cardBorder, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: `${(venueUtil[v.id] / maxVenueGames) * 100}%`, height: "100%", background: "linear-gradient(90deg, #3B82F6, #8B5CF6)", borderRadius: 6, transition: "width 0.5s" }} />
                  <span style={{ position: "absolute", right: 8, top: 3, fontSize: 12, fontWeight: 700, color: venueUtil[v.id] > maxVenueGames * 0.5 ? "#fff" : theme.text }}>
                    {venueUtil[v.id]} games
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strength of Schedule */}
      {view === "sos" && (
        <div>
          <h4 style={{ margin: "0 0 4px", fontSize: 15 }}>Strength of Schedule</h4>
          <p style={{ fontSize: 12, color: theme.textMuted, margin: "0 0 12px" }}>Based on opponents' win rate. Set team records in the Teams tab for accurate values.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...teams].sort((a, b) => (sos[b.id] || 0) - (sos[a.id] || 0)).map((tm, i) => (
              <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: theme.rowBg, borderRadius: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, width: 24 }}>#{i + 1}</span>
                <Badge color={tm.color}>{tm.name}</Badge>
                <div style={{ flex: 1, height: 10, background: theme.cardBorder, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(sos[tm.id] || 0) * 100}%`, height: "100%", background: sos[tm.id] > 0.5 ? "#EF4444" : "#10B981", borderRadius: 5 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 50, textAlign: "right" }}>
                  {((sos[tm.id] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Playoffs ───
function PlayoffsTab({ teams, theme }) {
  const [bracket, setBracket] = useState([]);
  const [seedByRecord, setSeedByRecord] = useState(true);
  const [numTeams, setNumTeams] = useState(8);

  const generate = () => {
    const sorted = seedByRecord
      ? [...teams].sort((a, b) => ((b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))) - ((a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))))
      : teams;
    setBracket(generatePlayoffBracket(sorted.slice(0, numTeams), seedByRecord));
  };

  const setWinner = (roundIdx, matchIdx, winnerId) => {
    const newBracket = bracket.map(r => r.map(m => ({ ...m })));
    newBracket[roundIdx][matchIdx].winner = winnerId;
    // Advance winner
    if (roundIdx + 1 < newBracket.length) {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? "team1" : "team2";
      const winnerTeam = teams.find(tm => tm.id === winnerId) || { id: winnerId, name: "TBD", color: "#9CA3AF" };
      newBracket[roundIdx + 1][nextMatchIdx][slot] = winnerTeam;
    }
    setBracket(newBracket);
  };

  const roundNames = ["Round 1", "Quarterfinals", "Semifinals", "Finals", "Championship"];

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Playoff Bracket</h3>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: theme.textMuted }}>Teams in playoffs</label>
          <Input type="number" value={numTeams} onChange={v => setNumTeams(Math.max(2, Math.min(teams.length, +v)))} theme={theme} style={{ width: 80 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={seedByRecord} onChange={e => setSeedByRecord(e.target.checked)} />
          <label style={{ fontSize: 13 }}>Seed by record</label>
        </div>
        <Button variant="success" onClick={generate} disabled={teams.length < 2}>Generate Bracket</Button>
      </div>

      {bracket.length === 0 && <p style={{ color: theme.textMuted, textAlign: "center", padding: 30 }}>Click "Generate Bracket" to create the playoff bracket.</p>}

      {bracket.length > 0 && (
        <div style={{ display: "flex", gap: 24, overflowX: "auto", padding: "10px 0" }}>
          {bracket.map((round, rIdx) => (
            <div key={rIdx} style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", minWidth: 200, gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, textAlign: "center", marginBottom: 4 }}>
                {roundNames[bracket.length - 1 - rIdx] || `Round ${rIdx + 1}`}
              </div>
              {round.map((match, mIdx) => (
                <div key={mIdx} style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
                  {[match.team1, match.team2].map((team, tIdx) => {
                    if (!team) return (
                      <div key={tIdx} style={{ padding: "10px 12px", background: theme.rowBg, fontSize: 13, color: theme.textMuted, borderBottom: tIdx === 0 ? `1px solid ${theme.cardBorder}` : "none" }}>
                        TBD
                      </div>
                    );
                    const isWinner = match.winner === team.id;
                    const isLoser = match.winner && match.winner !== team.id;
                    return (
                      <div key={tIdx}
                        onClick={() => !team.isBye && !isWinner && setWinner(rIdx, mIdx, team.id)}
                        style={{
                          padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                          background: isWinner ? team.color + "22" : theme.rowBg,
                          borderBottom: tIdx === 0 ? `1px solid ${theme.cardBorder}` : "none",
                          cursor: team.isBye ? "default" : "pointer",
                          opacity: isLoser ? 0.4 : 1,
                          borderLeft: isWinner ? `3px solid ${team.color}` : "3px solid transparent",
                        }}>
                        <span style={{ fontSize: 13, fontWeight: isWinner ? 700 : 500 }}>{team.name}</span>
                        {isWinner && <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>W</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {bracket.length > 0 && <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 12 }}>Click a team name to advance them to the next round.</p>}
    </div>
  );
}

// ─── Demo Data ───
function loadDemoData(setVenues, setTeams, setDivisions, setRivalries) {
  const dv = [
    { id: uid(), name: "Main Arena", timeSlots: ["17:00","19:00","21:00"], blackoutDates: [] },
    { id: uid(), name: "Fieldhouse", timeSlots: ["15:00","17:00","19:00"], blackoutDates: [] },
    { id: uid(), name: "Community Center", timeSlots: ["10:00","13:00","16:00"], blackoutDates: [] },
    { id: uid(), name: "Dome Stadium", timeSlots: ["18:00","20:00"], blackoutDates: [] },
  ];
  const names = ["Eagles","Lions","Panthers","Wolves","Falcons","Bears","Hawks","Tigers","Sharks","Cobras","Vipers","Stallions","Coyotes","Rams","Jaguars","Bison"];
  const dt = names.map((n, i) => ({
    id: uid(), name: n, color: COLORS[i % COLORS.length],
    preferredVenue: dv[i % dv.length].id, blackoutDates: [],
    wins: Math.floor(Math.random() * 15), losses: Math.floor(Math.random() * 15),
  }));
  const div1 = { id: uid(), name: "East Conference", teamIds: dt.slice(0, 8).map(x => x.id) };
  const div2 = { id: uid(), name: "West Conference", teamIds: dt.slice(8).map(x => x.id) };
  const riv = [
    { team1: dt[0].id, team2: dt[1].id },
    { team1: dt[8].id, team2: dt[9].id },
    { team1: dt[2].id, team2: dt[10].id },
  ];
  setVenues(dv); setTeams(dt); setDivisions([div1, div2]); setRivalries(riv);
}

// ─── Main App ───
export default function SportsScheduler() {
  const [dark, toggleDark] = useDarkMode();
  const theme = t(dark);
  const [tab, setTab] = useState("venues");
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [rivalries, setRivalries] = useState([]);
  const [config, setConfig] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    gamesPerDay: 6, minRestDays: 1, balanceHomeAway: true,
    roundRobin: "single", blackoutDates: [],
  });
  const [schedule, setSchedule] = useState([]);
  const [warning, setWarning] = useState("");

  const generate = useCallback(() => {
    const result = optimizeSchedule(teams, venues, { ...config, divisions }, rivalries);
    if (result.error) { setWarning(result.error); setSchedule([]); }
    else { setSchedule(result.games); setWarning(result.warning || ""); setTab("schedule"); }
  }, [teams, venues, config, divisions, rivalries]);

  const tabs = [
    { id: "venues", label: `Venues (${venues.length})` },
    { id: "teams", label: `Teams (${teams.length})` },
    { id: "divisions", label: "Divisions" },
    { id: "config", label: "Configure" },
    { id: "schedule", label: `Schedule${schedule.length ? ` (${schedule.length})` : ""}` },
    { id: "playoffs", label: "Playoffs" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "system-ui, -apple-system, sans-serif", color: theme.text, transition: "background 0.3s, color 0.3s" }}>
      <div style={{ background: theme.headerBg, padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, color: "#fff", fontSize: 26, fontWeight: 800 }}>Sports Schedule Optimizer</h1>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                Venues, teams, divisions, rivalries, time slots, blackout dates — fully optimized
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => loadDemoData(setVenues, setTeams, setDivisions, setRivalries)}
                style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", fontSize: 13 }}>Load 16-team demo</Button>
              <Button variant="ghost" onClick={toggleDark}
                style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", fontSize: 13 }}>{dark ? "Light Mode" : "Dark Mode"}</Button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: theme.tabBg, borderBottom: `1px solid ${theme.cardBorder}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                padding: "12px 18px", border: "none", background: "transparent",
                borderBottom: tab === tb.id ? `3px solid ${theme.tabActive}` : "3px solid transparent",
                fontWeight: tab === tb.id ? 700 : 500, fontSize: 14,
                color: tab === tb.id ? theme.tabActive : theme.textMuted,
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <Card theme={theme}>
          {tab === "venues" && <VenuesTab venues={venues} setVenues={setVenues} theme={theme} />}
          {tab === "teams" && <TeamsTab teams={teams} setTeams={setTeams} venues={venues} theme={theme} />}
          {tab === "divisions" && <DivisionsTab teams={teams} divisions={divisions} setDivisions={setDivisions} rivalries={rivalries} setRivalries={setRivalries} theme={theme} />}
          {tab === "config" && <ConfigTab teams={teams} venues={venues} config={config} setConfig={setConfig} onGenerate={generate} divisions={divisions} theme={theme} />}
          {tab === "schedule" && <ScheduleTab games={schedule} setGames={setSchedule} teams={teams} venues={venues} warning={warning} theme={theme} />}
          {tab === "playoffs" && <PlayoffsTab teams={teams} theme={theme} />}
        </Card>
      </div>
    </div>
  );
}
