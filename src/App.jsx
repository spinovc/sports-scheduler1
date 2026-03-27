import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

const SportsScheduleOptimizer = () => {
  // Theme function
  const t = (dark) => ({
    bg: dark ? '#1a1a1a' : '#ffffff',
    card: dark ? '#2d2d2d' : '#f5f5f5',
    text: dark ? '#ffffff' : '#000000',
    textMuted: dark ? '#999999' : '#666666',
    cardBorder: dark ? '#444444' : '#dddddd',
    inputBg: dark ? '#333333' : '#ffffff',
    inputBorder: dark ? '#555555' : '#cccccc',
    rowBg: dark ? '#252525' : '#fafafa',
    highlight: '#4a90e2',
    warning: '#f5a623',
    warningBorder: '#f59e0b',
    headerBg: dark ? '#1a1a1a' : '#f9f9f9',
    tabBg: dark ? '#2d2d2d' : '#e8e8e8',
    tabActive: '#4a90e2',
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

  // Render functions for each tab
  const renderWelcome = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚽</div>
      <h1 style={{ fontSize: '48px', color: theme.text, marginBottom: '20px' }}>
        Sports Schedule Optimizer
      </h1>
      <p style={{ fontSize: '18px', color: theme.textMuted, marginBottom: '40px' }}>
        Manage venues, teams, and generate optimal sports schedules
      </p>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('venues')}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            backgroundColor: theme.highlight,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Get Started
        </button>
        <button
          onClick={loadDemoData}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            backgroundColor: theme.card,
            color: theme.text,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Load Demo
        </button>
      </div>
    </div>
  );

  const renderVenues = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Venues</h2>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Venue name"
          id="venueName"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            flex: 1,
          }}
        />
        <input
          type="number"
          placeholder="Capacity"
          id="venueCapacity"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '120px',
          }}
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
            backgroundColor: theme.highlight,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Venue
        </button>
      </div>

      {venues.map((venue) => (
        <div
          key={venue.id}
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            padding: '15px',
            marginBottom: '10px',
            borderRadius: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: theme.text, margin: '0 0 8px 0' }}>{venue.name}</h3>
              <p style={{ color: theme.textMuted, margin: '0', fontSize: '14px' }}>
                Capacity: {venue.capacity}
              </p>
              <p style={{ color: theme.textMuted, margin: '5px 0 0 0', fontSize: '12px' }}>
                Time Slots: {venue.timeSlots.join(', ')}
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
                padding: '8px 12px',
                backgroundColor: theme.warning,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTeams = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Teams</h2>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Team name"
          id="teamName"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            flex: 1,
            minWidth: '150px',
          }}
        />
        <input
          type="color"
          id="teamColor"
          defaultValue="#ff6b6b"
          style={{
            padding: '5px',
            backgroundColor: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '60px',
            cursor: 'pointer',
          }}
        />
        <select
          id="teamDivision"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
          }}
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
            backgroundColor: theme.highlight,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Team
        </button>
      </div>

      {teams.map((team) => {
        const div = divisions.find((d) => d.id === team.division);
        return (
          <div
            key={team.id}
            style={{
              backgroundColor: theme.card,
              border: `3px solid ${team.color}`,
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: theme.text, margin: '0 0 8px 0' }}>{team.name}</h3>
                <p style={{ color: theme.textMuted, margin: '0', fontSize: '14px' }}>
                  Division: {div ? div.name : 'N/A'}
                </p>
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
                  padding: '8px 12px',
                  backgroundColor: theme.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDivisions = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Divisions</h2>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Division name"
          id="divisionName"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            flex: 1,
          }}
        />
        <button
          onClick={() => {
            const name = document.getElementById('divisionName').value;
            if (name) {
              const newDivision = {
                id: `d-${Date.now()}`,
                name,
              };
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
            backgroundColor: theme.highlight,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Division
        </button>
      </div>

      {divisions.map((division) => {
        const divTeams = teams.filter((t) => t.division === division.id);
        return (
          <div
            key={division.id}
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: theme.text, margin: 0 }}>{division.name}</h3>
              <button
                onClick={() => {
                  const newDivisions = divisions.filter((d) => d.id !== division.id);
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
                  padding: '8px 12px',
                  backgroundColor: theme.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.cardBorder}` }}>
              <p style={{ color: theme.textMuted, margin: '0 0 10px 0', fontSize: '14px' }}>
                Teams: {divTeams.length}
              </p>
              {divTeams.map((team) => (
                <span
                  key={team.id}
                  style={{
                    display: 'inline-block',
                    backgroundColor: team.color,
                    color: '#fff',
                    padding: '4px 8px',
                    marginRight: '8px',
                    marginBottom: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <h3 style={{ color: theme.text, marginTop: '30px' }}>Rivalries</h3>
      <p style={{ color: theme.textMuted }}>Rivalry teams get priority for prime time slots</p>
    </div>
  );

  const renderConfigure = () => (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2 style={{ color: theme.text }}>Configure Schedule</h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: theme.text, marginBottom: '8px' }}>
          Games Per Team (Same Division):
        </label>
        <input
          type="number"
          min="0"
          max="5"
          value={configGamesPerTeamSameDiv}
          onChange={(e) => setConfigGamesPerTeamSameDiv(parseInt(e.target.value))}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: theme.text, marginBottom: '8px' }}>
          Games Per Team (Other Divisions):
        </label>
        <input
          type="number"
          min="0"
          max="5"
          value={configGamesPerTeamOtherDiv}
          onChange={(e) => setConfigGamesPerTeamOtherDiv(parseInt(e.target.value))}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', color: theme.text }}>
          <input
            type="checkbox"
            checked={configAllowDoubleHeaders}
            onChange={(e) => setConfigAllowDoubleHeaders(e.target.checked)}
            style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
          />
          Allow Double Headers
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: theme.text, marginBottom: '8px' }}>
          Start Date:
        </label>
        <input
          type="date"
          value={configStartDate}
          onChange={(e) => setConfigStartDate(e.target.value)}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', color: theme.text, marginBottom: '8px' }}>
          End Date:
        </label>
        <input
          type="date"
          value={configEndDate}
          onChange={(e) => setConfigEndDate(e.target.value)}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        onClick={generateSchedule}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: theme.highlight,
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Generate Schedule
      </button>
    </div>
  );

  const renderSchedule = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Schedule</h2>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedTeamFilter}
          onChange={(e) => setSelectedTeamFilter(e.target.value)}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
          }}
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {schedule
        .filter((game) => {
          if (!selectedTeamFilter) return true;
          return game.homeTeam === selectedTeamFilter || game.awayTeam === selectedTeamFilter;
        })
        .map((game) => {
          const homeTeam = teams.find((t) => t.id === game.homeTeam);
          const awayTeam = teams.find((t) => t.id === game.awayTeam);
          const venue = venues.find((v) => v.id === game.venue);
          const score = gameScores[game.id];
          const dateStr = game.date.toLocaleDateString();
          return (
            <div
              key={game.id}
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: theme.textMuted, margin: '0 0 8px 0', fontSize: '12px' }}>
                    {dateStr} • {game.timeSlot} • {venue ? venue.name : 'TBD'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: homeTeam?.color, fontWeight: 'bold', fontSize: '16px' }}>
                      {homeTeam?.name}
                    </span>
                    <span style={{ color: theme.textMuted }}>
                      {score?.homeScore !== undefined ? `${score.homeScore}` : '-'}
                    </span>
                    <span style={{ color: theme.textMuted }}>vs</span>
                    <span style={{ color: theme.textMuted }}>
                      {score?.awayScore !== undefined ? `${score.awayScore}` : '-'}
                    </span>
                    <span style={{ color: awayTeam?.color, fontWeight: 'bold', fontSize: '16px' }}>
                      {awayTeam?.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newScore =
                      score?.homeScore !== undefined
                        ? { homeScore: undefined, awayScore: undefined, notes: '' }
                        : { homeScore: 0, awayScore: 0, notes: '' };
                    const newGameScores = { ...gameScores, [game.id]: newScore };
                    setGameScores(newGameScores);
                    const newState = {
                      venues,
                      teams,
                      divisions,
                      gameScores: newGameScores,
                      schedule,
                      referees,
                      archivedSeasons,
                    };
                    saveState(newState);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: theme.highlight,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {score?.homeScore !== undefined ? 'Edit' : 'Score'}
                </button>
              </div>

              {score?.homeScore !== undefined && (
                <div
                  style={{
                    marginTop: '15px',
                    paddingTop: '15px',
                    borderTop: `1px solid ${theme.cardBorder}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ color: theme.text, fontSize: '12px', display: 'block' }}>
                        {homeTeam?.name} Score:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={score.homeScore}
                        onChange={(e) => {
                          const newGameScores = {
                            ...gameScores,
                            [game.id]: {
                              ...score,
                              homeScore: parseInt(e.target.value),
                            },
                          };
                          setGameScores(newGameScores);
                        }}
                        style={{
                          padding: '5px',
                          width: '80px',
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          border: `1px solid ${theme.inputBorder}`,
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: theme.text, fontSize: '12px', display: 'block' }}>
                        {awayTeam?.name} Score:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={score.awayScore}
                        onChange={(e) => {
                          const newGameScores = {
                            ...gameScores,
                            [game.id]: {
                              ...score,
                              awayScore: parseInt(e.target.value),
                            },
                          };
                          setGameScores(newGameScores);
                        }}
                        style={{
                          padding: '5px',
                          width: '80px',
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          border: `1px solid ${theme.inputBorder}`,
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: theme.text, fontSize: '12px', display: 'block' }}>
                      Notes:
                    </label>
                    <input
                      type="text"
                      value={score.notes || ''}
                      onChange={(e) => {
                        const newGameScores = {
                          ...gameScores,
                          [game.id]: {
                            ...score,
                            notes: e.target.value,
                          },
                        };
                        setGameScores(newGameScores);
                      }}
                      style={{
                        padding: '5px',
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: `2px solid ${theme.cardBorder}` }}>
        <h3 style={{ color: theme.text }}>Game Density Heatmap</h3>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {schedule.map((game, idx) => {
            const completed = gameScores[game.id]?.homeScore !== undefined;
            return (
              <div
                key={idx}
                title={`Game ${idx + 1}: ${completed ? 'Completed' : 'Pending'}`}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: completed ? theme.highlight : theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: `2px solid ${theme.cardBorder}` }}>
        <h3 style={{ color: theme.text }}>Venue Utilization</h3>
        {venues.map((venue) => {
          const venueGames = schedule.filter((g) => g.venue === venue.id);
          const utilization = venues.length > 0 ? (venueGames.length / schedule.length) * 100 : 0;
          return (
            <div key={venue.id} style={{ marginBottom: '15px' }}>
              <p style={{ color: theme.text, margin: '0 0 8px 0' }}>{venue.name}</p>
              <div
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  height: '20px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.highlight,
                    height: '100%',
                    width: `${utilization}%`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <p style={{ color: theme.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
                {venueGames.length} games ({utilization.toFixed(1)}%)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStandings = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Standings</h2>

      <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '4px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: theme.headerBg }}>
              <th style={{ padding: '12px', textAlign: 'left', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                Rank
              </th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                Team
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                W
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                L
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                PCT
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                Streak
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: theme.text, borderBottom: `2px solid ${theme.cardBorder}` }}>
                GB
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => (
              <tr
                key={s.teamId}
                style={{
                  backgroundColor: idx % 2 === 0 ? theme.rowBg : theme.card,
                  borderBottom: `1px solid ${theme.cardBorder}`,
                }}
              >
                <td style={{ padding: '12px', color: theme.text }}>{idx + 1}</td>
                <td style={{ padding: '12px', color: theme.text, fontWeight: 'bold' }}>
                  {s.teamName}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: theme.text }}>
                  {s.wins}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: theme.text }}>
                  {s.losses}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: theme.text }}>
                  {s.pct}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: theme.text }}>
                  {s.streak}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: theme.textMuted }}>
                  {s.gb}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: '15px', borderRadius: '4px' }}>
        <h3 style={{ color: theme.text, margin: '0 0 15px 0' }}>Strength of Schedule</h3>
        <p style={{ color: theme.textMuted, fontSize: '14px' }}>
          Strength of schedule is calculated based on opponent win percentages
        </p>
      </div>
    </div>
  );

  const renderTeamHub = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Team Hub</h2>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedTeamFilter}
          onChange={(e) => setSelectedTeamFilter(e.target.value)}
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <option value="">Select a Team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTeamFilter && (
        <>
          {(() => {
            const teamStats = standings.find((s) => s.teamId === selectedTeamFilter);
            const homeGames = teamStats?.games.filter((g) => g.home) || [];
            const awayGames = teamStats?.games.filter((g) => !g.home) || [];
            const homeWins = homeGames.filter((g) => g.score > g.opponentScore).length;
            const awayWins = awayGames.filter((g) => g.score > g.opponentScore).length;

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                  <div
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      padding: '20px',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ color: theme.textMuted, margin: '0 0 10px 0', fontSize: '12px' }}>
                      Record
                    </p>
                    <p style={{ color: theme.text, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      {teamStats?.wins}-{teamStats?.losses}
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      padding: '20px',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ color: theme.textMuted, margin: '0 0 10px 0', fontSize: '12px' }}>
                      Home
                    </p>
                    <p style={{ color: theme.text, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      {homeWins}-{homeGames.length - homeWins}
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      padding: '20px',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ color: theme.textMuted, margin: '0 0 10px 0', fontSize: '12px' }}>
                      Away
                    </p>
                    <p style={{ color: theme.text, margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      {awayWins}-{awayGames.length - awayWins}
                    </p>
                  </div>
                </div>

                <h3 style={{ color: theme.text }}>Games</h3>
                {schedule
                  .filter(
                    (game) =>
                      game.homeTeam === selectedTeamFilter || game.awayTeam === selectedTeamFilter
                  )
                  .map((game) => {
                    const homeTeam = teams.find((t) => t.id === game.homeTeam);
                    const awayTeam = teams.find((t) => t.id === game.awayTeam);
                    const score = gameScores[game.id];
                    return (
                      <div
                        key={game.id}
                        style={{
                          backgroundColor: theme.card,
                          border: `1px solid ${theme.cardBorder}`,
                          padding: '15px',
                          marginBottom: '10px',
                          borderRadius: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ color: theme.text, margin: 0, fontWeight: 'bold' }}>
                              {homeTeam?.name} vs {awayTeam?.name}
                            </p>
                            <p style={{ color: theme.textMuted, fontSize: '12px', margin: '5px 0 0 0' }}>
                              {game.date.toLocaleDateString()}
                            </p>
                          </div>
                          {score?.homeScore !== undefined && (
                            <p style={{ color: theme.text, fontWeight: 'bold' }}>
                              {score.homeScore} - {score.awayScore}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </>
            );
          })()}
        </>
      )}
    </div>
  );

  const renderPlayoffs = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Playoffs</h2>
      <p style={{ color: theme.textMuted, marginBottom: '20px' }}>
        Division-based seeding for playoff competition
      </p>

      {divisions.map((division) => {
        const divisionStandings = standings.filter((s) => {
          const team = teams.find((t) => t.id === s.teamId);
          return team?.division === division.id;
        });

        return (
          <div
            key={division.id}
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              padding: '20px',
              marginBottom: '20px',
              borderRadius: '4px',
            }}
          >
            <h3 style={{ color: theme.text, margin: '0 0 15px 0' }}>{division.name}</h3>
            {divisionStandings.map((s, idx) => (
              <div
                key={s.teamId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: idx < divisionStandings.length - 1 ? `1px solid ${theme.cardBorder}` : 'none',
                }}
              >
                <span style={{ color: theme.text }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '30px',
                      height: '30px',
                      backgroundColor: theme.highlight,
                      color: '#fff',
                      borderRadius: '50%',
                      textAlign: 'center',
                      lineHeight: '30px',
                      marginRight: '10px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    {idx + 1}
                  </span>
                  {s.teamName}
                </span>
                <span style={{ color: theme.textMuted }}>
                  {s.wins}-{s.losses}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const renderRefs = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Referees</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Referee name"
          id="refName"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            flex: 1,
          }}
        />
        <select
          id="refExperience"
          style={{
            padding: '10px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
          }}
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
              const newRef = {
                id: `r-${Date.now()}`,
                name,
                experience,
              };
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
            backgroundColor: theme.highlight,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Referee
        </button>
      </div>

      {referees.map((ref) => {
        const gamesAssigned = schedule.filter((g) => g.referee === ref.id).length;
        return (
          <div
            key={ref.id}
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: theme.text, margin: '0 0 8px 0' }}>{ref.name}</h3>
                <p style={{ color: theme.textMuted, margin: '0', fontSize: '14px' }}>
                  Experience: {ref.experience}
                </p>
                <p style={{ color: theme.textMuted, margin: '5px 0 0 0', fontSize: '12px' }}>
                  Games: {gamesAssigned}
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
                  padding: '8px 12px',
                  backgroundColor: theme.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      <h3 style={{ color: theme.text, marginTop: '30px' }}>Workload View</h3>
      {referees.length === 0 ? (
        <p style={{ color: theme.textMuted }}>No referees added yet</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {referees.map((ref) => {
            const gamesAssigned = schedule.filter((g) => g.referee === ref.id).length;
            const avgGames = schedule.length > 0 ? Math.floor(schedule.length / referees.length) : 0;
            return (
              <div
                key={ref.id}
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  padding: '15px',
                  borderRadius: '4px',
                }}
              >
                <p style={{ color: theme.text, fontWeight: 'bold', margin: 0 }}>{ref.name}</p>
                <p style={{ color: theme.textMuted, fontSize: '12px', margin: '5px 0 0 0' }}>
                  {gamesAssigned} / {avgGames} games
                </p>
                <div
                  style={{
                    backgroundColor: theme.rowBg,
                    height: '8px',
                    borderRadius: '4px',
                    marginTop: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: theme.highlight,
                      height: '100%',
                      width: `${avgGames > 0 ? (gamesAssigned / avgGames) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme.text }}>Season History</h2>

      {archivedSeasons.length === 0 ? (
        <p style={{ color: theme.textMuted }}>No archived seasons yet</p>
      ) : (
        <div>
          {archivedSeasons.map((season) => (
            <div
              key={season.id}
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: theme.text, margin: 0 }}>
                    {new Date(season.date).toLocaleDateString()}
                  </h3>
                  <p style={{ color: theme.textMuted, margin: '5px 0 0 0', fontSize: '14px' }}>
                    {season.completedGames.length} games played
                  </p>
                </div>
                <button
                  style={{
                    padding: '8px 12px',
                    backgroundColor: theme.highlight,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: theme.headerBg,
          borderBottom: `1px solid ${theme.cardBorder}`,
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ color: theme.text, margin: 0, fontSize: '24px' }}>Sports Schedule Optimizer</h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
            style={{
              padding: '8px 12px',
              backgroundColor: historyIndex <= 0 ? theme.card : theme.highlight,
              color: historyIndex <= 0 ? theme.textMuted : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: historyIndex <= 0 ? 'default' : 'pointer',
              fontSize: '14px',
            }}
          >
            ↶
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= stateHistory.length - 1}
            title="Redo"
            style={{
              padding: '8px 12px',
              backgroundColor: historyIndex >= stateHistory.length - 1 ? theme.card : theme.highlight,
              color: historyIndex >= stateHistory.length - 1 ? theme.textMuted : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: historyIndex >= stateHistory.length - 1 ? 'default' : 'pointer',
              fontSize: '14px',
            }}
          >
            ↷
          </button>

          <button
            onClick={handleExport}
            title="Export"
            style={{
              padding: '8px 12px',
              backgroundColor: theme.highlight,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Export
          </button>

          <label
            title="Import"
            style={{
              padding: '8px 12px',
              backgroundColor: theme.highlight,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-block',
            }}
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
            onClick={() => setDark(!dark)}
            title="Dark Mode"
            style={{
              padding: '8px 12px',
              backgroundColor: theme.highlight,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          <button
            onClick={handleArchiveSeason}
            title="Archive Season"
            style={{
              padding: '8px 12px',
              backgroundColor: theme.warning,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Archive
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          backgroundColor: theme.headerBg,
          borderBottom: `1px solid ${theme.cardBorder}`,
          display: 'flex',
          overflow: 'x auto',
          padding: '0 20px',
          gap: '2px',
        }}
      >
        {[
          { id: 'welcome', label: '🏠 Welcome' },
          { id: 'venues', label: '🏟️ Venues' },
          { id: 'teams', label: '👥 Teams' },
          { id: 'divisions', label: '📊 Divisions' },
          { id: 'configure', label: '⚙️ Configure' },
          { id: 'schedule', label: '📅 Schedule' },
          { id: 'standings', label: '🏆 Standings' },
          { id: 'team-hub', label: '👤 Team Hub' },
          { id: 'playoffs', label: '🎯 Playoffs' },
          { id: 'refs', label: '👨‍⚖️ Refs' },
          { id: 'history', label: '📚 History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '15px 20px',
              backgroundColor: activeTab === tab.id ? theme.tabActive : 'transparent',
              color: activeTab === tab.id ? '#fff' : theme.text,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
  );
};

export default SportsScheduleOptimizer;
