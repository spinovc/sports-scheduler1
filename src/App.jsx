import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

const SportsScheduleOptimizer = () => {
  // Modern theme function
  const t = (dark) => ({
    bg: dark ? '#111113' : '#fafafa',
    card: dark ? '#1c1c1e' : '#fff',
    text: dark ? '#e5e5e7' : '#1a1a1a',
    textMuted: dark ? '#8e8e93' : '#6b7280',
    border: dark ? '#2d2d2f' : '#e5e5e5',
    inputBg: dark ? '#2d2d2f' : '#fff',
    inputBorder: dark ? '#3a3a3c' : '#e5e5e5',
    accent: '#5b5fc7',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    accentLight: dark ? 'rgba(91, 95, 199, 0.1)' : 'rgba(91, 95, 199, 0.1)',
  });

  // State declarations
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [gameScores, setGameScores] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [referees, setReferees] = useState([]);
  const [archivedSeasons, setArchivedSeasons] = useState([]);
  const [stateHistory, setStateHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [venueEditMode, setVenueEditMode] = useState(null);
  const [teamEditMode, setTeamEditMode] = useState(null);
  const [divisionEditMode, setDivisionEditMode] = useState(null);
  const [refEditMode, setRefEditMode] = useState(null);
  const [configGamesPerTeamSameDiv, setConfigGamesPerTeamSameDiv] = useState(1);
  const [configGamesPerTeamOtherDiv, setConfigGamesPerTeamOtherDiv] = useState(0);
  const [configAllowDoubleHeaders, setConfigAllowDoubleHeaders] = useState(true);
  const [configStartDate, setConfigStartDate] = useState('2026-04-01');
  const [configEndDate, setConfigEndDate] = useState('2026-08-31');

  const theme = t(dark);

  // Inject global styles
  useEffect(() => {
    const styleId = 'sports-scheduler-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(91, 95, 199, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(91, 95, 199, 0.5);
        }

        /* Focus states */
        button:focus {
          outline: none;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
        }

        /* Smooth transitions */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Save state to history
  const saveState = useCallback((newState) => {
    const newHistory = stateHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setStateHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [stateHistory, historyIndex]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = stateHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      applyHistoryState(prevState);
    }
  }, [historyIndex, stateHistory]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex < stateHistory.length - 1) {
      const nextState = stateHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      applyHistoryState(nextState);
    }
  }, [historyIndex, stateHistory]);

  // Apply history state
  const applyHistoryState = (state) => {
    setVenues(state.venues);
    setTeams(state.teams);
    setDivisions(state.divisions);
    setGameScores(state.gameScores);
    setSchedule(state.schedule);
    setReferees(state.referees);
    setArchivedSeasons(state.archivedSeasons);
  };

  // Load demo data
  const loadDemoData = () => {
    const demoVenues = [
      {
        id: 'v1',
        name: 'Central Arena',
        capacity: 500,
        timeSlots: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'],
        primeTimeSlots: ['7:00 PM'],
        blackoutDates: [],
      },
      {
        id: 'v2',
        name: 'East Field',
        capacity: 300,
        timeSlots: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'],
        primeTimeSlots: ['6:00 PM'],
        blackoutDates: [],
      },
      {
        id: 'v3',
        name: 'West Court',
        capacity: 250,
        timeSlots: ['10:00 AM', '2:00 PM', '5:00 PM'],
        primeTimeSlots: [],
        blackoutDates: [],
      },
    ];

    const demoDivisions = [
      { id: 'd1', name: 'Division A' },
      { id: 'd2', name: 'Division B' },
    ];

    const demoTeams = [
      {
        id: 't1',
        name: 'Hawks',
        color: '#ff6b6b',
        division: 'd1',
        preferredVenues: ['v1'],
        blackoutDates: [],
      },
      {
        id: 't2',
        name: 'Eagles',
        color: '#4ecdc4',
        division: 'd1',
        preferredVenues: ['v1', 'v2'],
        blackoutDates: [],
      },
      {
        id: 't3',
        name: 'Tigers',
        color: '#ffe66d',
        division: 'd2',
        preferredVenues: ['v2', 'v3'],
        blackoutDates: [],
      },
      {
        id: 't4',
        name: 'Panthers',
        color: '#95e1d3',
        division: 'd2',
        preferredVenues: ['v3'],
        blackoutDates: [],
      },
    ];

    const demoReferees = [
      { id: 'r1', name: 'John Smith', experience: 'Expert' },
      { id: 'r2', name: 'Sarah Johnson', experience: 'Intermediate' },
      { id: 'r3', name: 'Mike Davis', experience: 'Beginner' },
    ];

    const newState = {
      venues: demoVenues,
      teams: demoTeams,
      divisions: demoDivisions,
      gameScores: {},
      schedule: [],
      referees: demoReferees,
      archivedSeasons: [],
    };

    setVenues(demoVenues);
    setTeams(demoTeams);
    setDivisions(demoDivisions);
    setReferees(demoReferees);
    setGameScores({});
    setSchedule([]);
    setArchivedSeasons([]);

    saveState(newState);
  };

  // Export data
  const handleExport = () => {
    const data = {
      venues,
      teams,
      divisions,
      gameScores,
      schedule,
      referees,
      archivedSeasons,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sports-schedule-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setVenues(data.venues || []);
        setTeams(data.teams || []);
        setDivisions(data.divisions || []);
        setGameScores(data.gameScores || {});
        setSchedule(data.schedule || []);
        setReferees(data.referees || []);
        setArchivedSeasons(data.archivedSeasons || []);
        const newState = {
          venues: data.venues || [],
          teams: data.teams || [],
          divisions: data.divisions || [],
          gameScores: data.gameScores || {},
          schedule: data.schedule || [],
          referees: data.referees || [],
          archivedSeasons: data.archivedSeasons || [],
        };
        saveState(newState);
      } catch (error) {
        alert('Error importing file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Archive season
  const handleArchiveSeason = () => {
    const standings = calculateStandings();
    const completed = schedule.filter((g) => gameScores[g.id]?.homeScore !== undefined);
    const archived = {
      id: `season-${Date.now()}`,
      date: new Date().toISOString(),
      standings,
      completedGames: completed,
    };
    const newArchivedSeasons = [...archivedSeasons, archived];
    setArchivedSeasons(newArchivedSeasons);
    setSchedule([]);
    setGameScores({});
    const newState = {
      venues,
      teams,
      divisions,
      gameScores: {},
      schedule: [],
      referees,
      archivedSeasons: newArchivedSeasons,
    };
    saveState(newState);
  };

  // Generate schedule
  const generateSchedule = () => {
    const startDate = new Date(configStartDate);
    const endDate = new Date(configEndDate);
    const newSchedule = [];
    const gameId = () => `game-${Date.now()}-${Math.random()}`;

    const divisionTeams = {};
    divisions.forEach((div) => {
      divisionTeams[div.id] = teams.filter((t) => t.division === div.id);
    });

    let currentDate = new Date(startDate);
    let dayCounter = 0;

    // Generate round-robin games
    divisions.forEach((div) => {
      const divTeams = divisionTeams[div.id];
      for (let round = 0; round < configGamesPerTeamSameDiv; round++) {
        for (let i = 0; i < divTeams.length; i++) {
          for (let j = i + 1; j < divTeams.length; j++) {
            const game = {
              id: gameId(),
              homeTeam: divTeams[i].id,
              awayTeam: divTeams[j].id,
              date: new Date(currentDate),
              venue: divTeams[i].preferredVenues[0] || venues[0]?.id,
              timeSlot: '7:00 PM',
            };
            newSchedule.push(game);
            dayCounter++;
            if (dayCounter % 2 === 0) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
            if (currentDate > endDate) break;
          }
          if (currentDate > endDate) break;
        }
        if (currentDate > endDate) break;
      }
    });

    // Cross-division games
    if (configGamesPerTeamOtherDiv > 0) {
      const divArray = Object.keys(divisionTeams);
      for (let d1 = 0; d1 < divArray.length; d1++) {
        for (let d2 = d1 + 1; d2 < divArray.length; d2++) {
          const teams1 = divisionTeams[divArray[d1]];
          const teams2 = divisionTeams[divArray[d2]];
          for (let i = 0; i < teams1.length && i < configGamesPerTeamOtherDiv; i++) {
            const game = {
              id: gameId(),
              homeTeam: teams1[i].id,
              awayTeam: teams2[i % teams2.length].id,
              date: new Date(currentDate),
              venue: teams1[i].preferredVenues[0] || venues[0]?.id,
              timeSlot: '7:00 PM',
            };
            newSchedule.push(game);
            dayCounter++;
            if (dayCounter % 2 === 0) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
            if (currentDate > endDate) break;
          }
        }
      }
    }

    newSchedule.sort((a, b) => a.date - b.date);
    setSchedule(newSchedule);
    const newState = {
      venues,
      teams,
      divisions,
      gameScores,
      schedule: newSchedule,
      referees,
      archivedSeasons,
    };
    saveState(newState);
  };

  // Calculate standings
  const calculateStandings = () => {
    const stats = {};
    teams.forEach((team) => {
      stats[team.id] = { wins: 0, losses: 0, streak: 0, games: [] };
    });

    schedule.forEach((game) => {
      const score = gameScores[game.id];
      if (score && score.homeScore !== undefined && score.awayScore !== undefined) {
        stats[game.homeTeam].games.push({
          opponent: game.awayTeam,
          home: true,
          score: score.homeScore,
          opponentScore: score.awayScore,
        });
        stats[game.awayTeam].games.push({
          opponent: game.homeTeam,
          home: false,
          score: score.awayScore,
          opponentScore: score.homeScore,
        });

        if (score.homeScore > score.awayScore) {
          stats[game.homeTeam].wins++;
          stats[game.awayTeam].losses++;
        } else {
          stats[game.awayTeam].wins++;
          stats[game.homeTeam].losses++;
        }
      }
    });

    const standings = teams.map((team) => {
      const s = stats[team.id];
      const total = s.wins + s.losses;
      const pct = total > 0 ? (s.wins / total).toFixed(3) : '.000';
      return {
        teamId: team.id,
        teamName: team.name,
        wins: s.wins,
        losses: s.losses,
        pct,
        streak: s.streak,
        games: s.games,
      };
    });

    standings.sort((a, b) => {
      const aPct = parseFloat(a.pct);
      const bPct = parseFloat(b.pct);
      if (aPct !== bPct) return bPct - aPct;
      return b.wins - a.wins;
    });

    const avgWins = standings.length > 0 ? standings[0].wins : 0;
    standings.forEach((s) => {
      s.gb = (avgWins - s.wins).toFixed(1);
    });

    return standings;
  };

  const standings = useMemo(() => calculateStandings(), [teams, schedule, gameScores]);

  // Navigation items
  const navItems = [
    { id: 'welcome', label: 'Welcome', icon: '→' },
    { id: 'venues', label: 'Venues', icon: '◆' },
    { id: 'teams', label: 'Teams', icon: '●' },
    { id: 'divisions', label: 'Divisions', icon: '■' },
    { id: 'configure', label: 'Configure', icon: '⚙' },
    { id: 'schedule', label: 'Schedule', icon: '📋' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
    { id: 'team-hub', label: 'Team Hub', icon: '👥' },
    { id: 'playoffs', label: 'Playoffs', icon: '🎯' },
    { id: 'refs', label: 'Referees', icon: '∙' },
    { id: 'history', label: 'History', icon: '↶' },
  ];

  // Render functions
  const renderWelcome = () => (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '700', color: theme.text, margin: '0 0 16px 0' }}>
          Sports Schedule Optimizer
        </h1>
        <p style={{ fontSize: '18px', color: theme.textMuted, margin: '0 0 48px 0', lineHeight: '1.6' }}>
          Create optimal sports schedules for your league. Manage venues, teams, divisions, and generate schedules in minutes.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('configure')}
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: '600',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Start Building
          </button>
          <button
            onClick={loadDemoData}
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: '600',
              backgroundColor: theme.card,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = theme.accentLight}
            onMouseOut={(e) => e.target.style.backgroundColor = theme.card}
          >
            Load Demo
          </button>
        </div>
        {teams.length > 0 && (
          <div style={{ marginTop: '64px', padding: '24px', backgroundColor: theme.card, borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.accent }}>{teams.length}</div>
                <div style={{ fontSize: '14px', color: theme.textMuted, marginTop: '4px' }}>Teams</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.accent }}>{divisions.length}</div>
                <div style={{ fontSize: '14px', color: theme.textMuted, marginTop: '4px' }}>Divisions</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.accent }}>{schedule.length}</div>
                <div style={{ fontSize: '14px', color: theme.textMuted, marginTop: '4px' }}>Games</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderVenues = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Venues</h2>
        <div style={{ display: 'flex', gap: '12px', backgroundColor: theme.card, padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
          <input
            type="text"
            placeholder="Venue name"
            id="venueName"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              flex: 1,
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <input
            type="number"
            placeholder="Capacity"
            id="venueCapacity"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '140px',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <button
            onClick={() => {
              const name = document.getElementById('venueName').value;
              const capacity = parseInt(document.getElementById('venueCapacity').value);
              if (name && capacity) {
                const newVenue = {
                  id: `v-${Date.now()}`,
                  name,
                  capacity,
                  timeSlots: ['9:00 AM', '1:00 PM', '7:00 PM'],
                  primeTimeSlots: ['7:00 PM'],
                  blackoutDates: [],
                };
                const newVenues = [...venues, newVenue];
                setVenues(newVenues);
                document.getElementById('venueName').value = '';
                document.getElementById('venueCapacity').value = '';
                const newState = {
                  venues: newVenues,
                  teams,
                  divisions,
                  gameScores,
                  schedule,
                  referees,
                  archivedSeasons,
                };
                saveState(newState);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Add Venue
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {venues.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No venues yet. Add one to get started.</p>
          </div>
        ) : (
          venues.map((venue) => (
            <div
              key={venue.id}
              style={{
                backgroundColor: theme.card,
                padding: '20px',
                borderRadius: '10px',
                borderLeft: `4px solid ${theme.accent}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ color: theme.text, margin: '0 0 8px 0', fontWeight: '600' }}>{venue.name}</h3>
                <p style={{ color: theme.textMuted, margin: '0', fontSize: '13px' }}>
                  Capacity: {venue.capacity} • Time Slots: {venue.timeSlots.length}
                </p>
              </div>
              <button
                onClick={() => {
                  const newVenues = venues.filter((v) => v.id !== venue.id);
                  setVenues(newVenues);
                  const newState = {
                    venues: newVenues,
                    teams,
                    divisions,
                    gameScores,
                    schedule,
                    referees,
                    archivedSeasons,
                  };
                  saveState(newState);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: theme.danger,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderTeams = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Teams</h2>
        <div style={{ display: 'flex', gap: '12px', backgroundColor: theme.card, padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Team name"
            id="teamName"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              flex: '1',
              minWidth: '150px',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <input
            type="color"
            id="teamColor"
            defaultValue="#ff6b6b"
            style={{
              padding: '8px',
              backgroundColor: theme.inputBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '60px',
              cursor: 'pointer',
            }}
          />
          <select
            id="teamDivision"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          >
            <option value="">Select Division</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const name = document.getElementById('teamName').value;
              const color = document.getElementById('teamColor').value;
              const division = document.getElementById('teamDivision').value;
              if (name && division) {
                const newTeam = {
                  id: `t-${Date.now()}`,
                  name,
                  color,
                  division,
                  preferredVenues: [],
                  blackoutDates: [],
                };
                const newTeams = [...teams, newTeam];
                setTeams(newTeams);
                document.getElementById('teamName').value = '';
                document.getElementById('teamDivision').value = '';
                const newState = {
                  venues,
                  teams: newTeams,
                  divisions,
                  gameScores,
                  schedule,
                  referees,
                  archivedSeasons,
                };
                saveState(newState);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Add Team
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {teams.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No teams yet. Add one to get started.</p>
          </div>
        ) : (
          teams.map((team) => {
            const div = divisions.find((d) => d.id === team.division);
            return (
              <div
                key={team.id}
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${team.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: team.color, borderRadius: '6px' }} />
                  <div>
                    <h3 style={{ color: theme.text, margin: '0 0 4px 0', fontWeight: '600' }}>{team.name}</h3>
                    <p style={{ color: theme.textMuted, margin: '0', fontSize: '13px' }}>
                      {div ? div.name : 'N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newTeams = teams.filter((t) => t.id !== team.id);
                    setTeams(newTeams);
                    const newState = {
                      venues,
                      teams: newTeams,
                      divisions,
                      gameScores,
                      schedule,
                      referees,
                      archivedSeasons,
                    };
                    saveState(newState);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: theme.danger,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderDivisions = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Divisions</h2>
        <div style={{ display: 'flex', gap: '12px', backgroundColor: theme.card, padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
          <input
            type="text"
            placeholder="Division name"
            id="divisionName"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              flex: 1,
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <button
            onClick={() => {
              const name = document.getElementById('divisionName').value;
              if (name) {
                const newDivision = { id: `d-${Date.now()}`, name };
                const newDivisions = [...divisions, newDivision];
                setDivisions(newDivisions);
                document.getElementById('divisionName').value = '';
                const newState = {
                  venues,
                  teams,
                  divisions: newDivisions,
                  gameScores,
                  schedule,
                  referees,
                  archivedSeasons,
                };
                saveState(newState);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Add Division
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {divisions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No divisions yet. Add one to get started.</p>
          </div>
        ) : (
          divisions.map((div) => {
            const divTeams = teams.filter((t) => t.division === div.id);
            return (
              <div
                key={div.id}
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${theme.accent}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ color: theme.text, margin: '0 0 8px 0', fontWeight: '600' }}>{div.name}</h3>
                  <p style={{ color: theme.textMuted, margin: '0', fontSize: '13px' }}>
                    {divTeams.length} team{divTeams.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newDivisions = divisions.filter((d) => d.id !== div.id);
                    setDivisions(newDivisions);
                    const newState = {
                      venues,
                      teams,
                      divisions: newDivisions,
                      gameScores,
                      schedule,
                      referees,
                      archivedSeasons,
                    };
                    saveState(newState);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: theme.danger,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderConfigure = () => (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '600px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Configure Schedule</h2>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div>
          <label style={{ display: 'block', color: theme.text, marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Games Per Team (Same Division)
          </label>
          <input
            type="number"
            min="0"
            max="5"
            value={configGamesPerTeamSameDiv}
            onChange={(e) => setConfigGamesPerTeamSameDiv(parseInt(e.target.value))}
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: theme.text, marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Games Per Team (Other Divisions)
          </label>
          <input
            type="number"
            min="0"
            max="5"
            value={configGamesPerTeamOtherDiv}
            onChange={(e) => setConfigGamesPerTeamOtherDiv(parseInt(e.target.value))}
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', color: theme.text, cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={configAllowDoubleHeaders}
            onChange={(e) => setConfigAllowDoubleHeaders(e.target.checked)}
            style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
          />
          Allow Double Headers
        </label>

        <div>
          <label style={{ display: 'block', color: theme.text, marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Start Date
          </label>
          <input
            type="date"
            value={configStartDate}
            onChange={(e) => setConfigStartDate(e.target.value)}
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: theme.text, marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            End Date
          </label>
          <input
            type="date"
            value={configEndDate}
            onChange={(e) => setConfigEndDate(e.target.value)}
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
        </div>

        <button
          onClick={generateSchedule}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: theme.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginTop: '12px',
          }}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          Generate Schedule
        </button>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Schedule</h2>

      <div style={{ marginBottom: '24px' }}>
        <select
          value={selectedTeamFilter}
          onChange={(e) => setSelectedTeamFilter(e.target.value)}
          style={{
            padding: '10px 12px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => e.target.style.borderColor = theme.accent}
          onBlur={(e) => e.target.style.borderColor = theme.border}
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {schedule.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No games scheduled. Go to Configure to generate a schedule.</p>
          </div>
        ) : (
          schedule
            .filter((game) => {
              if (!selectedTeamFilter) return true;
              return game.homeTeam === selectedTeamFilter || game.awayTeam === selectedTeamFilter;
            })
            .map((game) => {
              const homeTeam = teams.find((t) => t.id === game.homeTeam);
              const awayTeam = teams.find((t) => t.id === game.awayTeam);
              const score = gameScores[game.id];
              const venue = venues.find((v) => v.id === game.venue);
              return (
                <div
                  key={game.id}
                  style={{
                    backgroundColor: theme.card,
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', backgroundColor: homeTeam?.color, borderRadius: '4px' }} />
                        <span style={{ fontWeight: '600', color: theme.text }}>{homeTeam?.name}</span>
                      </div>
                      <span style={{ color: theme.textMuted }}>vs</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', backgroundColor: awayTeam?.color, borderRadius: '4px' }} />
                        <span style={{ fontWeight: '600', color: theme.text }}>{awayTeam?.name}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: theme.textMuted }}>
                      {game.date.toLocaleDateString()} at {game.timeSlot} • {venue?.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {score && score.homeScore !== undefined ? (
                      <div style={{ fontSize: '16px', fontWeight: '700', color: theme.accent }}>
                        {score.homeScore}-{score.awayScore}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          placeholder="0"
                          value={score?.homeScore ?? ''}
                          onChange={(e) =>
                            setGameScores({
                              ...gameScores,
                              [game.id]: { ...score, homeScore: parseInt(e.target.value) || 0 },
                            })
                          }
                          style={{
                            width: '50px',
                            padding: '6px 8px',
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                        <input
                          type="number"
                          placeholder="0"
                          value={score?.awayScore ?? ''}
                          onChange={(e) =>
                            setGameScores({
                              ...gameScores,
                              [game.id]: { ...score, awayScore: parseInt(e.target.value) || 0 },
                            })
                          }
                          style={{
                            width: '50px',
                            padding: '6px 8px',
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );

  const renderStandings = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Standings</h2>

      {standings.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
          <p style={{ fontSize: '14px' }}>No standings data. Complete some games to see standings.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: theme.card, borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.accentLight, borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: theme.text, fontSize: '13px' }}>Team</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: theme.text, fontSize: '13px' }}>Wins</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: theme.text, fontSize: '13px' }}>Losses</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: theme.text, fontSize: '13px' }}>PCT</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: theme.text, fontSize: '13px' }}>GB</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.teamId} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: idx % 2 === 0 ? theme.bg : theme.card }}>
                  <td style={{ padding: '12px 16px', color: theme.text, fontWeight: '500', fontSize: '14px' }}>{s.teamName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: theme.text, fontSize: '14px' }}>{s.wins}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: theme.text, fontSize: '14px' }}>{s.losses}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: theme.accent, fontWeight: '600', fontSize: '14px' }}>{s.pct}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>{s.gb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTeamHub = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Team Hub</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {teams.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted, gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '14px' }}>No teams yet. Create teams to see them here.</p>
          </div>
        ) : (
          teams.map((team) => {
            const teamStats = standings.find((s) => s.teamId === team.id);
            return (
              <div key={team.id} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '10px', borderLeft: `4px solid ${team.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: theme.text, margin: '0 0 12px 0', fontWeight: '600' }}>{team.name}</h3>
                {teamStats && (
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: theme.textMuted }}>Wins</div>
                      <div style={{ color: theme.accent, fontWeight: '600', fontSize: '16px' }}>{teamStats.wins}</div>
                    </div>
                    <div>
                      <div style={{ color: theme.textMuted }}>Losses</div>
                      <div style={{ color: theme.accent, fontWeight: '600', fontSize: '16px' }}>{teamStats.losses}</div>
                    </div>
                    <div>
                      <div style={{ color: theme.textMuted }}>PCT</div>
                      <div style={{ color: theme.accent, fontWeight: '600', fontSize: '16px' }}>{teamStats.pct}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderPlayoffs = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Playoffs</h2>
      <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
        <p style={{ fontSize: '14px' }}>Playoff bracket feature coming soon.</p>
      </div>
    </div>
  );

  const renderRefs = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>Referees</h2>
        <div style={{ display: 'flex', gap: '12px', backgroundColor: theme.card, padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
          <input
            type="text"
            placeholder="Referee name"
            id="refName"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              flex: 1,
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <select
            id="refExperience"
            style={{
              padding: '10px 12px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Expert">Expert</option>
          </select>
          <button
            onClick={() => {
              const name = document.getElementById('refName').value;
              const experience = document.getElementById('refExperience').value;
              if (name) {
                const newRef = { id: `r-${Date.now()}`, name, experience };
                const newReferees = [...referees, newRef];
                setReferees(newReferees);
                document.getElementById('refName').value = '';
                const newState = {
                  venues,
                  teams,
                  divisions,
                  gameScores,
                  schedule,
                  referees: newReferees,
                  archivedSeasons,
                };
                saveState(newState);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Add Referee
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {referees.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No referees yet. Add one to get started.</p>
          </div>
        ) : (
          referees.map((ref) => (
            <div
              key={ref.id}
              style={{
                backgroundColor: theme.card,
                padding: '20px',
                borderRadius: '10px',
                borderLeft: `4px solid ${theme.accent}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ color: theme.text, margin: '0 0 4px 0', fontWeight: '600' }}>{ref.name}</h3>
                <p style={{ color: theme.textMuted, margin: '0', fontSize: '13px' }}>
                  {ref.experience}
                </p>
              </div>
              <button
                onClick={() => {
                  const newReferees = referees.filter((r) => r.id !== ref.id);
                  setReferees(newReferees);
                  const newState = {
                    venues,
                    teams,
                    divisions,
                    gameScores,
                    schedule,
                    referees: newReferees,
                    archivedSeasons,
                  };
                  saveState(newState);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: theme.danger,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme.text, margin: '0 0 24px 0' }}>History</h2>
      <div style={{ display: 'grid', gap: '12px' }}>
        {archivedSeasons.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '14px' }}>No archived seasons yet.</p>
          </div>
        ) : (
          archivedSeasons.map((season) => (
            <div key={season.id} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
              <h3 style={{ color: theme.text, margin: '0 0 8px 0', fontWeight: '600' }}>
                Season from {new Date(season.date).toLocaleDateString()}
              </h3>
              <p style={{ color: theme.textMuted, margin: '0', fontSize: '13px' }}>
                {season.completedGames.length} games completed • {season.standings.length} teams
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '220px',
          backgroundColor: theme.card,
          borderRight: `1px solid ${theme.border}`,
          padding: '24px 0',
          overflowY: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ paddingBottom: '32px', borderBottom: `1px solid ${theme.border}`, marginBottom: '32px' }}>
          <div style={{ padding: '0 16px', fontSize: '18px', fontWeight: '700', color: theme.text, marginBottom: '4px' }}>
            Optimizer
          </div>
          <div style={{ padding: '0 16px', fontSize: '12px', color: theme.textMuted }}>
            Sports Scheduler
          </div>
        </div>

        <nav style={{ marginBottom: '24px' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: activeTab === item.id ? theme.accentLight : 'transparent',
                color: activeTab === item.id ? theme.accent : theme.text,
                border: 'none',
                borderLeft: activeTab === item.id ? `3px solid ${theme.accent}` : '3px solid transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? '600' : '500',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (activeTab !== item.id) {
                  e.target.style.backgroundColor = theme.accentLight;
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== item.id) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ marginRight: '8px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px', padding: '16px', display: 'grid', gap: '8px' }}>
          <button
            onClick={() => setDark(!dark)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.accentLight,
              color: theme.accent,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            {dark ? '☀ Light' : '🌙 Dark'}
          </button>

          <button
            onClick={handleExport}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.accentLight,
              color: theme.accent,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Export
          </button>

          <label
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.accentLight,
              color: theme.accent,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.15s ease',
              textAlign: 'center',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={handleArchiveSeason}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: theme.warning,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Archive Season
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Page Header */}
        <div style={{ padding: '24px 40px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: theme.text }}>
            {navItems.find((item) => item.id === activeTab)?.label || 'Welcome'}
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              style={{
                padding: '8px 12px',
                backgroundColor: historyIndex <= 0 ? theme.inputBg : theme.accent,
                color: historyIndex <= 0 ? theme.textMuted : '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: historyIndex <= 0 ? 'default' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (historyIndex > 0) e.target.style.opacity = '0.9';
              }}
              onMouseOut={(e) => {
                if (historyIndex > 0) e.target.style.opacity = '1';
              }}
            >
              ↶
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= stateHistory.length - 1}
              title="Redo (Ctrl+Y)"
              style={{
                padding: '8px 12px',
                backgroundColor: historyIndex >= stateHistory.length - 1 ? theme.inputBg : theme.accent,
                color: historyIndex >= stateHistory.length - 1 ? theme.textMuted : '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: historyIndex >= stateHistory.length - 1 ? 'default' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (historyIndex < stateHistory.length - 1) e.target.style.opacity = '0.9';
              }}
              onMouseOut={(e) => {
                if (historyIndex < stateHistory.length - 1) e.target.style.opacity = '1';
              }}
            >
              ↷
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {activeTab === 'welcome' && renderWelcome()}
          {activeTab === 'venues' && renderVenues()}
          {activeTab === 'teams' && renderTeams()}
          {activeTab === 'divisions' && renderDivisions()}
          {activeTab === 'configure' && renderConfigure()}
          {activeTab === 'schedule' && renderSchedule()}
          {activeTab === 'standings' && renderStandings()}
          {activeTab === 'team-hub' && renderTeamHub()}
          {activeTab === 'playoffs' && renderPlayoffs()}
          {activeTab === 'refs' && renderRefs()}
          {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default SportsScheduleOptimizer;
