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
  const getUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    cargarPartidos()
  }

  getUser()

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user || null)
    }
  )

  return () => {
    listener.subscription.unsubscribe()
  }
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
      nombre:
        user.user_metadata?.nombre ||
        user.user_metadata?.full_name ||
        user.email
    })
  }

  const salirEquipo = async (partidoId) => {
  const user = (await supabase.auth.getUser()).data.user

  await supabase
    .from('partido_jugadores')
    .delete()
    .eq('partido_id', partidoId)
    .eq('usuario_id', user.id)
}

if (!user) {
  return (
    <Pantalla>
      <h1 style={styles.brand}>Derbys Ambush FC</h1>

      <AuthEmail />

      <br />

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
<button
  style={styles.logoutBtn}
  onClick={async () => {
    await supabase.auth.signOut()
    setUser(null)
  }}
>
  Salir
</button>
    </div>

    <Routes>

  <Route path="/" element={<Navigate to="/inicio" />} />
  <Route path="/inicio" element={
    <div>
      <h2>Bienvenido a Derbys Ambush FC</h2>
      <p>Usa el menú para navegar ⚽</p>
    </div>
    } />
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
            <select
              style={styles.input}
              onChange={(e) => setCancha(e.target.value)}
            >
              <option value="">Seleccionar cancha</option>
              <option value="Americano">Americano</option>
              <option value="Colon">Colón</option>
            </select>

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
          salirEquipo={salirEquipo}
          eliminarPartido={eliminarPartido}
          esAdmin={esAdmin}
          ver={() => setPartidoEnVivo(p)}
        />
      ))}
    </div>

  </>
} />

      <Route path="/stats" element={<Stats />} />

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
      <button onClick={() => navigate('/inicio')}>🏠</button>
      <button onClick={() => navigate('/partidos')}>⚽</button>
      <button onClick={() => navigate('/stats')}>📊</button>
    </div>
  )
}

function PartidoCard({ partido, unirse, eliminarPartido, esAdmin, ver, salirEquipo
 }) {
  const [conteo, setConteo] = useState({ A: 0, B: 0 })
  const [jugadoresA, setJugadoresA] = useState([])
  const [jugadoresB, setJugadoresB] = useState([])

  const cargarConteo = async () => {  
  const { data } = await supabase
    .from('partido_jugadores')
    .select('equipo, nombre')
    .eq('partido_id', partido.id)

  setConteo({
    A: data.filter(j => j.equipo === 'A').length,
    B: data.filter(j => j.equipo === 'B').length
  })

  setJugadoresA(data.filter(j => j.equipo === 'A'))
  setJugadoresB(data.filter(j => j.equipo === 'B'))
}

useEffect(() => {
  cargarConteo()

  const canal = supabase
    .channel('jugadores-' + partido.id)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partido_jugadores',
        filter: `partido_id=eq.${partido.id}`
      },
      () => {
        cargarConteo()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canal)
  }
}, [partido.id])

  return (
    <div style={styles.card}>
      <h3>{partido.cancha}</h3>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
  {new Date(partido.fecha_hora).toLocaleString()}
</p>

      <div style={styles.row}>
    <button
      style={styles.blueBtn}
      onClick={async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    const { data: actual } = await supabase
      .from('partido_jugadores')
      .select('*')
      .eq('partido_id', partido.id)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (actual?.equipo === 'A') {
      await salirEquipo(partido.id)
    } else {
      await salirEquipo(partido.id)
      await unirse(partido.id, 'A')
    }

    cargarConteo()
  }}
>
  BLUE ({conteo.A})
</button>

    <button
  style={styles.redBtn}
  onClick={async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    const { data: actual } = await supabase
      .from('partido_jugadores')
      .select('*')
      .eq('partido_id', partido.id)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (actual?.equipo === 'B') {
      await salirEquipo(partido.id)
    } else {
      await salirEquipo(partido.id)
      await unirse(partido.id, 'B')
    }

    cargarConteo()
  }}
>
  RED ({conteo.B})
</button>

      </div>

    <div style={{ marginTop: 10 }}>

  <strong>Jugadores:</strong>

  <div>
    <small>BLUE:</small>
    {jugadoresA.map((j, i) => (
      <span key={i}> {j.nombre},</span>
    ))}
  </div>

  <div>
    <small>RED:</small>
    {jugadoresB.map((j, i) => (
      <span key={i}> {j.nombre},</span>
    ))}
  </div>

</div>

      <button style={styles.secondaryBtn} onClick={ver}>Ver Partido</button>

      {esAdmin && (
        <button style={styles.deleteBtn} onClick={() => eliminarPartido(partido.id)}>
          Eliminar
        </button>
      )}
    </div>
  )
}

function PartidoEnVivo({ partido, volver }) {
  const [jugadoresA, setJugadoresA] = useState([])
  const [jugadoresB, setJugadoresB] = useState([])
  const [goles, setGoles] = useState([])

  const golesA = goles.filter(g => g.equipo === 'A').length
  const golesB = goles.filter(g => g.equipo === 'B').length

  const cargarTodo = async () => {
    const { data: golesData } = await supabase
      .from('goles')
      .select('*')
      .eq('partido_id', partido.id)
      .order('minuto', { ascending: true })

    setGoles(golesData || [])

    const { data: jugadores } = await supabase
      .from('partido_jugadores')
      .select('nombre, equipo')
      .eq('partido_id', partido.id)

    setJugadoresA(jugadores.filter(j => j.equipo === 'A'))
    setJugadoresB(jugadores.filter(j => j.equipo === 'B'))
  }

   const registrarGol = async (equipo, jugador) => {
    const minuto = prompt("Minuto del gol (ej: 23)")

    if (!minuto) return

    const { data } = await supabase.auth.getUser()
    const user = data.user

    await supabase.from('goles').insert({
      partido_id: partido.id,
      equipo,
      jugador,
      usuario_id: user.id,
      minuto: Number(minuto)
    })

    cargarTodo()
  }

  const eliminarGol = async (id) => {
  const confirmar = confirm("¿Eliminar este gol?")

  if (!confirmar) return

  const { error } = await supabase
    .from('goles')
    .delete()
    .eq('id', id)

  if (error) {
    console.log("ERROR AL ELIMINAR:", error)
    alert("No se pudo eliminar el gol")
    return
  }

  cargarTodo()
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

      <h3 style={{ marginTop: 30 }}>Eventos del partido</h3>
      {console.log("GOLES:", goles)}
      {goles.map((g, id) => (
  <div
    key={g.id}
    style={{
      background: '#0006',
      padding: 8,
      margin: '5px 0',
      borderRadius: 8,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    <span>
      ⚽ {g.jugador} ({g.equipo === 'A' ? 'BLUE' : 'RED'}) - {g.minuto}'
    </span>

    <button
      style={{ background: 'red', border: 'none', color: 'white', borderRadius: 6 }}
      onClick={() => {
        console.log("ELIMINANDO GOL ID:", g.id)
        eliminarGol(g.id)}
      }>
      ❌
    </button>
  </div>
))}

      <div style={styles.playersWrapper}>
        <div style={styles.teamBox}>
          <h3>BLUE</h3>
          {jugadoresA.map((j, i) => (
            <button
              key={i}
              style={styles.blueBtn}
              onClick={() => registrarGol('A', j.nombre)}
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
              onClick={() => registrarGol('B', j.nombre)}
            >
              ⚽ {j.nombre}
            </button>
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

function AuthEmail() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
  const [nombre, setNombre] = useState('')

const handleAuth = async () => {

  if (modo === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    const nombre = data.user?.user_metadata?.nombre

    if (!nombre) {
      alert("Debes crear tu cuenta con nombre primero")
      await supabase.auth.signOut()
      return
    }

    window.location.reload()
  }

  else {

    if (!nombre) {
      alert("Debes ingresar tu nombre")
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre
        }
      }
    })

    if (error) {
      alert(error.message)
    } else {
      alert("Cuenta creada, ahora inicia sesión")
      setModo('login')
    }
  }
}

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 300,
      margin: 'auto'
    }}>

        {modo === 'register' && (
      <input
        placeholder="Nombre completo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        style={styles.input}
      />
    )}

      <input
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      <button style={styles.primaryBtn} onClick={handleAuth}>
        {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>

      <button
        style={styles.secondaryBtn}
        onClick={() =>
          setModo(modo === 'login' ? 'register' : 'login')
        }
      >
        {modo === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  )
}

function Stats() {
  const [tablaGlobal, setTablaGlobal] = useState([])
  const [tablaAmericano, setTablaAmericano] = useState([])
  const [tablaColon, setTablaColon] = useState([])
  const [goleadores, setGoleadores] = useState([])
  const [mvp, setMvp] = useState(null)

  const calcularTabla = (partidos, goles) => {
    const equipos = {
      A: { nombre: 'BLUE', PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 },
      B: { nombre: 'RED', PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 }
    }

    partidos.forEach(p => {
      const golesPartido = goles.filter(g => g.partido_id === p.id)

      const golesA = golesPartido.filter(g => g.equipo === 'A').length
      const golesB = golesPartido.filter(g => g.equipo === 'B').length

      equipos.A.PJ++
      equipos.B.PJ++

      equipos.A.GF += golesA
      equipos.A.GC += golesB

      equipos.B.GF += golesB
      equipos.B.GC += golesA

      if (golesA > golesB) {
        equipos.A.G++
        equipos.B.P++
      } else if (golesB > golesA) {
        equipos.B.G++
        equipos.A.P++
      } else {
        equipos.A.E++
        equipos.B.E++
      }
    })

    return Object.values(equipos)
  }

  const cargarStats = async () => {
    const { data: partidos } = await supabase.from('partidos').select('*')
    const { data: goles } = await supabase.from('goles').select('*')

  if (!partidos || !goles) return

  // 🏆 TABLAS EQUIPOS
  setTablaGlobal(calcularTabla(partidos, goles))

    const partidosAmericano = partidos.filter(p => p.cancha === 'Americano')
  setTablaAmericano(calcularTabla(partidosAmericano, goles))

    const partidosColon = partidos.filter(p => p.cancha === 'Colon')
    setTablaColon(calcularTabla(partidosColon, goles))

const conteo = {}

goles.forEach(g => {
  if (!conteo[g.usuario_id]) {
    conteo[g.usuario_id] = {
      nombre: g.jugador,
      goles: 0,
      americano: 0,
      colon: 0
    }
  }

  conteo[g.usuario_id].goles++

  // 🔥 identificar cancha
  const partido = partidos.find(p => p.id === g.partido_id)

  if (partido?.cancha === 'Americano') {
    conteo[g.usuario_id].americano++
  }

  if (partido?.cancha === 'Colon') {
    conteo[g.usuario_id].colon++
  }
})

// 🔥 convertir a array
const ranking = Object.values(conteo)
  .map(j => ({
    ...j,
    promedio: (j.goles / (partidos.length || 1)).toFixed(2)
  }))
  .sort((a, b) => b.goles - a.goles)

setGoleadores(ranking)
setMvp(ranking[0] || null)
  }

  useEffect(() => {
    cargarStats()
  }, [])

 const renderTabla = (titulo, tabla) => (
  <div style={{ marginBottom: 15 }}>
    <h3>{titulo}</h3>

    <div style={{
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }}>
      {tabla.map((t, i) => (
        <div key={i} style={{
          background: '#0006',
          padding: 15,
          borderRadius: 12,
          minWidth: 120,
          textAlign: 'center',
          flex: '1'
        }}>
          <h4 style={{ marginBottom: 10 }}>{t.nombre}</h4>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14
          }}>
            <span>PJ {t.PJ}</span>
            <span>G {t.G}</span>
            <span>E {t.E}</span>
            <span>P {t.P}</span>
          </div>

          <div style={{
            marginTop: 10,
            fontSize: 14
          }}>
            ⚽ {t.GF} | 🥅 {t.GC}
          </div>
        </div>
      ))}
    </div>
  </div>
)

return (
  <div>

    <h2 style={{ textAlign: 'center' }}>📊 Dashboard</h2>

    {/* 🏆 EQUIPOS */}
    <section>
      <h3>🏆 Equipos</h3>

     <div style={{
  display: 'flex',
  gap: 20,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
}}>

  {/* 🌍 IZQUIERDA */}
  <div style={{
    flex: 1,
    minWidth: 250
  }}>
    {renderTabla('🌍 Global', tablaGlobal)}
  </div>

  {/* 🏟️ DERECHA */}
  <div style={{
    flex: 1,
    minWidth: 250,
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  }}>
    {renderTabla('🏟️ Americano', tablaAmericano)}
    {renderTabla('🏟️ Colón', tablaColon)}
  </div>

</div>
    </section>

    {/* ⚽ JUGADORES */}
    <section style={{ marginTop: 40 }}>
      <h3>⚽ Jugadores</h3>

      {goleadores.map((g, i) => (
        <div key={i} style={{
          background: i === 0 ? '#FFD70033' : '#0006',
          padding: 12,
          margin: '6px 0',
          borderRadius: 10
        }}>
          <strong>#{i + 1} {g.nombre}</strong><br />

          ⚽ {g.goles} goles<br />
          📊 Promedio: {g.promedio}<br />
          🏟️ Colón: {g.colon} | Americano: {g.americano}
        </div>
      ))}
    </section>

    {/* 🥇 MVP */}
    {mvp && (
      <section style={{ marginTop: 40 }}>
        <h3>🥇 MVP Global</h3>

        <div style={{
          background: '#FFD70055',
          padding: 15,
          borderRadius: 12
        }}>
          <strong>{mvp.nombre}</strong><br />
          {mvp.goles} goles
        </div>
      </section>
    )}

    {/* 📊 GRÁFICA */}
    <section style={{ marginTop: 40 }}>
      <h3>📊 Goles por jugador</h3>

      {goleadores.slice(0, 5).map((g, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {g.nombre}
          <div style={{
            height: 10,
            background: '#333',
            borderRadius: 5
          }}>
            <div style={{
              width: `${g.goles * 10}px`,
              height: '100%',
              background: '#00ff88',
              borderRadius: 5
            }} />
          </div>
        </div>
      ))}
    </section>

  </div>
)
}

const styles = {
  bg: {
    backgroundImage: `url(${fondo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundrepeat: 'no-repeat',
    minHeight: '100vh',
    width: '100%',
    fontFamily: 'Oswald, sans-serif'
  },
  overlay: {
    backdropFilter: 'blur(6px)',
    background: 'rgba(0,0,0,0.55)',
    minHeight: '100vh',
    width: '100%',
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

