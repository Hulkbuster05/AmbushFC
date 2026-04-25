import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import fondo from './assets/fondoambush.png'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'

export default function App() {
  const [user, setUser] = useState(null)
  const [partidos, setPartidos] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [partidoEnVivo, setPartidoEnVivo] = useState(null)
  const [vista, setVista] = useState('partidos')
  const [cancha, setCancha] = useState('')
  const [jugadores, setJugadores] = useState('')
  const [fechaHora, setFechaHora] = useState('')

  const esAdmin = user?.email === 'alejandro012698@gmail.com'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      cargarPartidos()
    })
  }, [])

  const cargarPartidos = async () => {
    const { data } = await supabase
      .from('partidos')
      .select('*')
      .eq('estado', 'abierto')
      .order('fecha_hora')

    setPartidos(data || [])
  }

  const crearPartido = async () => {
    const fechaUTC = new Date(fechaHora).toISOString()
    await supabase.from('partidos').insert({
      fecha_hora: fechaUTC,
      cancha,
      jugadores,
      estado: 'abierto'
    })
    setMostrarForm(false)
    cargarPartidos()
  }

  const eliminarPartido = async (id) => {
    await supabase.from('partidos').delete().eq('id', id)
    cargarPartidos()
  }

  const unirse = async (partidoId, equipo) => {
    await supabase.from('partido_jugadores').insert({
      partido_id: partidoId,
      usuario_id: user.id,
      equipo,
      nombre: user.user_metadata?.full_name || user.email
    })
  }

  if (!user) {
    return (
      <Pantalla>
        <h1 style={styles.brand}>Derbys Ambush FC</h1>
        <button
          style={styles.primaryBtn}
          onClick={() =>
            supabase.auth.signInWithOAuth({ provider: 'google' })
          }
        >
          Entrar con Google
        </button>
      </Pantalla>
    )
  }

  if (partidoEnVivo) {
    return (
      <PartidoEnVivo
        partido={partidoEnVivo}
        volver={() => setPartidoEnVivo(null)}
      />
    )
  }

  return (
  <Pantalla>

    <div style={styles.header}>
      <h1 style={styles.brandSmall}>Derbys Ambush FC</h1>
      <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
        Salir
      </button>
    </div>

    <Routes>

  <Route path="/" element={<Navigate to="/partidos" />} />

  <Route path="/partidos" element={
  <>

    {esAdmin && (
      <>
        {!mostrarForm && (
          <button
            style={styles.primaryBtn}
            onClick={() => setMostrarForm(true)}
          >
            + Crear partido
          </button>
        )}

        {mostrarForm && (
          <div style={styles.cardForm}>
            <input
              placeholder="Cancha"
              style={styles.input}
              onChange={(e) => setCancha(e.target.value)}
            />
            <input
              type="datetime-local"
              style={styles.input}
              onChange={(e) => setFechaHora(e.target.value)}
            />
            <input
              placeholder="# jugadores"
              style={styles.input}
              onChange={(e) => setJugadores(e.target.value)}
            />
            <button style={styles.primaryBtn} onClick={crearPartido}>
              Guardar
            </button>
          </div>
        )}
      </>
    )}

    <div style={styles.grid}>
      {partidos.map((p) => (
        <PartidoCard
          key={p.id}
          partido={p}
          unirse={unirse}
          eliminarPartido={eliminarPartido}
          esAdmin={esAdmin}
          ver={() => setPartidoEnVivo(p)}
        />
      ))}
    </div>

  </>
} />

      <Route path="/stats" element={
        <div>
          <h2>Estadísticas</h2>
          <p>Próximamente 🔥</p>
        </div>
      } />

    </Routes>

    {/* MENÚ */}
    <MenuNavegacion />

  </Pantalla>
)
}

function MenuNavegacion() {
  const navigate = useNavigate()

  return (
    <div style={styles.floatingMenu}>
      <button onClick={() => navigate('/')}>🏠</button>
      <button onClick={() => navigate('/partidos')}>⚽</button>
      <button onClick={() => navigate('/stats')}>📊</button>
    </div>
  )
}

function PartidoCard({ partido, unirse, eliminarPartido, esAdmin, ver }) {
  const [conteo, setConteo] = useState({ A: 0, B: 0 })

  const cargarConteo = async () => {
    const { data } = await supabase
      .from('partido_jugadores')
      .select('equipo')
      .eq('partido_id', partido.id)

    setConteo({
      A: data.filter(j => j.equipo === 'A').length,
      B: data.filter(j => j.equipo === 'B').length
    })
  }

  useEffect(() => {
    cargarConteo()
    const canal = supabase
      .channel('jugadores-' + partido.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partido_jugadores', filter: `partido_id=eq.${partido.id}` },
        () => cargarConteo()
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [partido.id])

  return (
    <div style={styles.card}>
      <h3>{partido.cancha}</h3>

      <div style={styles.row}>
        <button style={styles.blueBtn} onClick={() => unirse(partido.id, 'A')}>
          BLUE ({conteo.A})
        </button>
        <button style={styles.redBtn} onClick={() => unirse(partido.id, 'B')}>
          RED ({conteo.B})
        </button>
      </div>

      <button style={styles.secondaryBtn} onClick={ver}>Ver partido</button>

      {esAdmin && (
        <button style={styles.deleteBtn} onClick={() => eliminarPartido(partido.id)}>
          Eliminar
        </button>
      )}
    </div>
  )
}

function PartidoEnVivo({ partido, volver }) {
  const [golesA, setGolesA] = useState(0)
  const [golesB, setGolesB] = useState(0)
  const [jugadoresA, setJugadoresA] = useState([])
  const [jugadoresB, setJugadoresB] = useState([])

  const cargarTodo = async () => {
    const { data: goles } = await supabase
      .from('goles')
      .select('*')
      .eq('partido_id', partido.id)

    setGolesA(goles.filter(g => g.equipo === 'A').length)
    setGolesB(goles.filter(g => g.equipo === 'B').length)

    const { data: jugadores } = await supabase
      .from('partido_jugadores')
      .select('nombre, equipo')
      .eq('partido_id', partido.id)

    setJugadoresA(jugadores.filter(j => j.equipo === 'A'))
    setJugadoresB(jugadores.filter(j => j.equipo === 'B'))
  }

  useEffect(() => {
    cargarTodo()
    const canal = supabase
      .channel('full-' + partido.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goles', filter: `partido_id=eq.${partido.id}` },
        () => cargarTodo()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partido_jugadores', filter: `partido_id=eq.${partido.id}` },
        () => cargarTodo()
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [partido.id])

  const sumarGol = async (equipo) => {
    await supabase.from('goles').insert({ partido_id: partido.id, equipo })
    cargarTodo()
  }
  const golDirecto = async (equipo, jugador) => {
  await supabase.from('goles').insert({
    partido_id: partido.id,
    equipo,
    jugador,
    minuto: Math.floor(Math.random() * 90)
  })
}
  const restarGol = async (equipo) => {
    const { data } = await supabase
      .from('goles')
      .select('id')
      .eq('partido_id', partido.id)
      .eq('equipo', equipo)
      .order('id', { ascending: false })
      .limit(1)

    if (data.length > 0) {
      await supabase.from('goles').delete().eq('id', data[0].id)
      cargarTodo()
    }
  }

  return (
    <Pantalla>
      <h1 style={styles.brandSmall}>Partido en Vivo</h1>

      <div style={styles.scoreContainer}>
        <div style={styles.teamScore}>
          <span>BLUE</span>
          <span style={styles.score}>{golesA}</span>
        </div>

        <div style={styles.vs}>VS</div>

        <div style={styles.teamScore}>
          <span>RED</span>
          <span style={styles.score}>{golesB}</span>
        </div>
      </div>

      <div style={styles.controls}>
        <div>
          <button style={styles.blueBtn} onClick={() => sumarGol('A')}>+</button>
          <button style={styles.secondaryBtn} onClick={() => restarGol('A')}>−</button>
        </div>

        <div>
          <button style={styles.redBtn} onClick={() => sumarGol('B')}>+</button>
          <button style={styles.secondaryBtn} onClick={() => restarGol('B')}>−</button>
        </div>
      </div>

 <div style={styles.playersWrapper}>
  <div style={styles.teamBox}>
    <h3>BLUE</h3>
    {jugadoresA.map((j, i) => (
      <button
        key={i}
        style={styles.blueBtn}
        onClick={() => golDirecto('A', j.nombre)}
      >
        ⚽ {j.nombre}
      </button>
    ))}
  </div>

  <div style={styles.teamBox}>
    <h3>RED</h3>
    {jugadoresB.map((j, i) => (
      <button
        key={i}
        style={styles.redBtn}
        onClick={() => golDirecto('B', j.nombre)}
      >
        ⚽ {j.nombre}
      </button>
    ))}
  </div>
</div>

      <button style={styles.deleteBtn} onClick={volver}>Volver</button>
    </Pantalla>
  )
}

function Pantalla({ children }) {
  return (
    <div style={styles.bg}>
      <div style={styles.overlay}>{children}</div>
    </div>
  )
}

const styles = {
  bg: {
    backgroundImage: `url(${fondo})`,
    backgroundSize: 'cover',
    minHeight: '100vh',
    fontFamily: 'Oswald, sans-serif'
  },
  overlay: {
    backdropFilter: 'blur(6px)',
    background: 'rgba(0,0,0,0.55)',
    minHeight: '100vh',
    padding: 30,
    color: 'white'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  logoutBtn: {
    background: '#000',
    color: 'white',
    padding: '8px 14px',
    borderRadius: 10,
    border: 'none'
  },
  brand: { fontSize: 70 },
  brandSmall: { fontSize: 40 },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20
  },
  card: {
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 20,
    width: 280
  },
  row: {
    display: 'flex',
    gap: 10
  },
  primaryBtn: {
    background: '#00c853',
    color: 'white',
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none'
  },
  secondaryBtn: {
    background: '#ffffff22',
    color: 'white',
    padding: '8px',
    borderRadius: 8,
    border: 'none'
  },
  blueBtn: {
    background: '#1e90ff',
    color: 'white',
    padding: '10px',
    borderRadius: 8,
    border: 'none'
  },
  redBtn: {
    background: '#ff2e2e',
    color: 'white',
    padding: '10px',
    borderRadius: 8,
    border: 'none'
  },
  deleteBtn: {
    marginTop: 20,
    background: '#000',
    color: 'white',
    padding: '10px',
    borderRadius: 10,
    border: 'none'
  },
  scoreContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 40
  },
  teamScore: {
    textAlign: 'center'
  },
  score: {
    fontSize: 80
  },
  vs: {
    fontSize: 20
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 20
  },
  playersWrapper: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 40
  },
  teamBox: {
    background: 'rgba(255,255,255,0.08)',
    padding: 15,
    borderRadius: 15
  },
  cardForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: 'none'
  }
}