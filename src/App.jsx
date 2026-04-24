import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import fondo from './assets/fondoambush.png'

export default function App() {
  const [user, setUser] = useState(null)
  const [partidos, setPartidos] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [partidoEnVivo, setPartidoEnVivo] = useState(null)

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
    nombre: user.user_metadata.full_name || user.email
  })
}

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    location.reload()
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
      <div style={styles.topBar}>
        <h1 style={styles.brandSmall}>Panel de Partidos</h1>
        <button style={styles.deleteBtn} onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>

      {esAdmin && (
        <>
          {!mostrarForm && (
            <button style={styles.primaryBtn} onClick={() => setMostrarForm(true)}>
              + Crear partido
            </button>
          )}

          {mostrarForm && (
            <div style={styles.cardForm}>
              <input placeholder="Cancha" style={styles.input} onChange={(e) => setCancha(e.target.value)} />
              <input type="datetime-local" style={styles.input} onChange={(e) => setFechaHora(e.target.value)} />
              <input placeholder="# jugadores" style={styles.input} onChange={(e) => setJugadores(e.target.value)} />
              <button style={styles.primaryBtn} onClick={crearPartido}>Guardar</button>
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
    </Pantalla>
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
      .channel('realtime-jugadores-' + partido.id)
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
    // Goles
    const { data: goles } = await supabase
      .from('goles')
      .select('*')
      .eq('partido_id', partido.id)

    setGolesA(goles.filter(g => g.equipo === 'A').length)
    setGolesB(goles.filter(g => g.equipo === 'B').length)

    // Jugadores
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
      .channel('realtime-full-' + partido.id)
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
    }
  }

  return (
    <Pantalla>
      <h1 style={styles.brandSmall}>Partido en Vivo</h1>

      {/* MARCADOR */}
      <div style={styles.scorePro}>
        <div>
          <h2>BLUE</h2>
          <h1 style={styles.score}>{golesA}</h1>
          <button style={styles.blueBtn} onClick={() => sumarGol('A')}>+</button>
          <button style={styles.secondaryBtn} onClick={() => restarGol('A')}>−</button>
        </div>

        <div>
          <h2>RED</h2>
          <h1 style={styles.score}>{golesB}</h1>
          <button style={styles.redBtn} onClick={() => sumarGol('B')}>+</button>
          <button style={styles.secondaryBtn} onClick={() => restarGol('B')}>−</button>
        </div>
      </div>

      {/* JUGADORES */}
      <div style={styles.playersContainer}>
        <div>
          <h3>BLUE</h3>
          {jugadoresA.map((j, i) => (
            <p key={i}>• {j.nombre}</p>
          ))}
        </div>

        <div>
          <h3>RED</h3>
          {jugadoresB.map((j, i) => (
            <p key={i}>• {j.nombre}</p>
          ))}
        </div>
      </div>

      <button style={styles.deleteBtn} onClick={volver}>
        Volver
      </button>
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
    color: 'white',
    textAlign: 'center'
  },
  brand: { fontSize: 70 },
  brandSmall: { fontSize: 40 },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    padding: 20,
    width: 280
  },
  cardForm: {
    margin: '20px auto',
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: 'none'
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 10
  },
  primaryBtn: {
    background: '#00c853',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: 10
  },
  secondaryBtn: {
    background: '#ffffff22',
    color: 'white',
    padding: '10px',
    borderRadius: 8,
    border: 'none'
  },
  blueBtn: {
    background: '#1e90ff',
    color: 'white',
    padding: '10px',
    borderRadius: 8,
    border: 'none',
    flex: 1
  },
  redBtn: {
    background: '#ff2e2e',
    color: 'white',
    padding: '10px',
    borderRadius: 8,
    border: 'none',
    flex: 1
  },
  deleteBtn: {
    background: '#000',
    color: 'white',
    padding: '8px',
    borderRadius: 8,
    border: 'none'
  },
  scoreBoard: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 40
  },
  scorePro: {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  marginTop: 30
  },
  score: {
  fontSize: 80,
  margin: '10px 0'
  },
  playersContainer: {
  display: 'flex',
  justifyContent: 'space-around',
  marginTop: 40,
  textAlign: 'left'
  }
}
