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
  const [filtroEstado, setFiltroEstado] = useState('abierto')
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
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .order('fecha_hora', { ascending: true })

  if (error) {
    console.log("ERROR:", error)
    return
  }

  console.log("PARTIDOS:", data)

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
        esAdmin={true}
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
      <p>⚽ Usa el menú para navegar ⚽</p>
    </div>
    } />
  <Route path="/partidos" element={
  <>
   <div style={{
  display: 'flex',
  gap: 10,
  marginBottom: 20
}}>
  <button
    style={{
      ...styles.secondaryBtn,
      background: filtroEstado === 'abierto' ? '#00c853' : '#ffffff22'
    }}
    onClick={() => setFiltroEstado('abierto')}
  >
    🟢 Activos
  </button>

  <button
    style={{
      ...styles.secondaryBtn,
      background: filtroEstado === 'cerrado' ? '#ff4d4d' : '#ffffff22'
    }}
    onClick={() => setFiltroEstado('cerrado')}
  >
    🔒 Finalizados
  </button>
</div>

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
      {partidos
        .filter(p => p.estado === filtroEstado)
        .sort((a,b) => {
          if (filtroEstado === 'cerrado') {
            return new Date(b.fecha_hora) - new Date(a.fecha_hora)
          }
          return new Date(a.fecha_hora) - new Date(b.fecha_hora)
        })
        .map((p) => (
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
      <Route path="/perfil" element={<Perfil />} />

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
      <button onClick={() => navigate('/perfil')}>👤</button>
    </div>
  )
}

function PartidoCard({ partido, unirse, eliminarPartido, esAdmin, ver, salirEquipo
 }) {
  const [conteo, setConteo] = useState({ A: 0, B: 0 })
  const [golesA, setGolesA] = useState(0)
  const [golesB, setGolesB] = useState(0)
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

  // 🔥 traer goles
const { data: goles } = await supabase
  .from('goles')
  .select('equipo')
  .eq('partido_id', partido.id)

const listaGoles = goles || []

setGolesA(listaGoles.filter(g => g.equipo === 'A').length)
setGolesB(listaGoles.filter(g => g.equipo === 'B').length)
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
      <div style={{ marginBottom: 8 }}>
  <div style={{ fontWeight: 'bold', fontSize: 16 }}>
    {partido.cancha} {partido.estado === 'cerrado' ? '🔒' : '🟢'}
  </div>

  <div style={{ fontSize: 12, opacity: 0.7 }}>
    {new Date(partido.fecha_hora).toLocaleString()}
  </div>
</div>

      <div style={styles.row}>
    <button
  style={{
    ...styles.blueBtn,
    opacity: partido.estado === 'cerrado' ? 0.5 : 1
  }}
  disabled={partido.estado === 'cerrado'}
  onClick={async () => {
    if (partido.estado === 'cerrado') {
      alert("El partido está cerrado")
      return
    }

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
  BLUE ({conteo.A}/{partido.jugadores})
</button>

    <button
  style={{
    ...styles.redBtn,
    opacity: partido.estado === 'cerrado' ? 0.5 : 1
  }}
  disabled={partido.estado === 'cerrado'}
  onClick={async () => {
    if (partido.estado === 'cerrado') {
      alert("El partido está cerrado")
      return
    }

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
  RED ({conteo.B}/{partido.jugadores})
</button>
</div>

{partido.estado === 'cerrado' && (
  <div style={{
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold'
  }}>
    ⚽ {golesA} - {golesB}

    <div style={{ 
      fontSize: 12, 
      textAlign: 'center',
      opacity: 0.8      
      }}>
      {golesA > golesB && '🔵 Ganó BLUE'}
      {golesB > golesA && '🔴 Ganó RED'}
      {golesA === golesB && '🤝 Empate'}
    </div>
  </div>
)}
      {/*
  <div>
   <div style={{ marginTop: 10 }}>
  <strong>Jugadores:</strong>

  <div style={{ marginTop: 5 }}>
    <small>BLUE:</small>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {jugadoresA.map((j, i) => (
        <div key={i} style={{
          background: '#001f3f',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12
        }}>
          {j.nombre}
        </div>
      ))}
    </div>
  </div>


  <div style={{ marginTop: 5 }}>
    <small>RED:</small>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {jugadoresB.map((j, i) => (
        <div key={i} style={{
          background: '#5a0000',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12
        }}>
          {j.nombre}
        </div>
      ))}
    </div>
  </div>
</div>
  </div>
  */}

      <button style={{
        ...styles.secondaryBtn,
        marginTop: 8,
        padding: '6px',
        fontSize: 12
        }} 
        onClick={ver}
      >
      Ver
      </button>
      
      {esAdmin && (
  <button
    style={{
      ...styles.secondaryBtn,
      marginTop: 8,
      padding: '6px',
      fontSize: 12,
      background: partido.estado === 'cerrado' ? '#2e7d32' : '#b71c1c'
    }}
    onClick={async () => {
      const nuevoEstado = partido.estado === 'cerrado' ? 'abierto' : 'cerrado'

      const confirmar = window.confirm(
        nuevoEstado === 'cerrado'
          ? "¿Cerrar partido?"
          : "¿Reabrir partido?"
      )

      if (!confirmar) return

      const { error } = await supabase
        .from('partidos')
        .update({ estado: nuevoEstado })
        .eq('id', partido.id)

      if (error) {
        console.log(error)
        alert("Error al cambiar estado")
        return
      }

      alert(
        nuevoEstado === 'cerrado'
          ? "Partido cerrado 🔒"
          : "Partido abierto 🟢"
      )

      window.location.reload()
    }}
  >
    {partido.estado === 'cerrado'
      ? 'Abrir Partido 🟢'
      : 'Cerrar Partido 🔒'}
  </button>
)}

      {esAdmin && (
        <button style={{
          ...styles.secondaryBtn,
          marginTop: 8,
          padding: '6px',
          fontSize: 12,
          background: '#000'
        }} 
        onClick={() => {
          const confirmar = window.confirm("¿Eliminar este partido?")
          if (!confirmar) return
          eliminarPartido(partido.id)
        }}>
          Eliminar
        </button>
      )}
    </div>
  )
}

function PartidoEnVivo({ partido, volver ,esAdmin}) {
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
      .select('nombre, equipo, usuario_id')
      .eq('partido_id', partido.id)

    setJugadoresA(jugadores.filter(j => j.equipo === 'A'))
    setJugadoresB(jugadores.filter(j => j.equipo === 'B'))
  }

  const registrarGol = async (equipo, jugadorObj) => {
  const minuto = prompt("Minuto del gol (ej: 23)")
  if (!minuto) return

  await supabase.from('goles').insert({
    partido_id: partido.id,
    equipo,
    jugador: jugadorObj.nombre,
    usuario_id: jugadorObj.usuario_id || null,
    minuto: Number(minuto)
  })

  cargarTodo()
}

  const eliminarGol = async (id) => {

    if (partido.estado === 'cerrado') {
      alert("Partido cerrado, no se pueden eliminar goles")
      return
    }

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

const eliminarJugador = async (usuario_id) => {

  if (partido.estado === 'cerrado') {
    alert("No puedes modificar jugadores en un partido cerrado")
    return
  }

  const confirmar = confirm("¿Eliminar jugador del partido?")
  if (!confirmar) return

  const { error } = await supabase
    .from('partido_jugadores')
    .delete()
    .eq('partido_id', partido.id)
    .eq('usuario_id', usuario_id)

  if (error) {
    console.log("ERROR AL ELIMINAR JUGADOR:", error)
    alert("No se pudo eliminar el jugador")
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
      {goles.map((g) => (
  <div
    key={g.id}
    style={{
      display: 'flex',
      justifyContent: g.equipo === 'A' ? 'flex-start' : 'flex-end',
      margin: '6px 0'
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: g.equipo === 'A' ? '#007bff33' : '#ff4d4d33',
      padding: '4px 8px',
      fontSize: 13,
      borderRadius: 10,
      maxWidth: '70%',
      flexDirection: g.equipo === 'A' ? 'row' : 'row-reverse'
    }}>

      {/* TEXTO */}
      <span style={{
        textAlign: g.equipo === 'A' ? 'left' : 'right'
      }}>
        {g.equipo === 'A'
          ? `⚽ ${g.jugador} ${g.minuto}'`
          : `${g.minuto}' ${g.jugador} ⚽`}
      </span>

      {/* BOTÓN ELIMINAR */}
      {partido.estado === 'abierto' && (
        <button
          style={{
            background: 'red',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            width: 18,
            height: 18,
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
        }}
        onClick={() => {
          console.log("ELIMINANDO GOL ID:", g.id)
          eliminarGol(g.id)
        }}
      >
        ❌
      </button>
      )}

    </div>
  </div>
))}

      <div style={styles.playersWrapper}>
        <div style={styles.teamBox}>
          <h3>BLUE</h3>
          {jugadoresA.map((j, i) => (
            
  <div
    key={i}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }}
  >
    {/* BOTÓN PARA GOL */}
    <button
      style={{ ...styles.blueBtn, flex: 1 }}
      onClick={() => {
        if (partido.estado === 'cerrado') {
          alert("Partido cerrado")
          return
        }
        registrarGol('A', j)
      }}
    >
      {j.nombre}
    </button>

    {/* BOTÓN ADMIN ❌ */}
    {esAdmin && partido.estado === 'abierto' && (
      <button
        style={{
          background: 'red',
          border: 'none',
          color: 'white',
          borderRadius: 6,
          width: 20,
          height: 20,
          fontSize: 12,
          cursor: 'pointer'
        }}
        onClick={() => eliminarJugador(j.usuario_id)}
      >
        ❌
      </button>
    )}
  </div>
))}
        </div>

      {/* 🔥 BOTÓN DESCONOCIDO BLUE */}
<div style={{ marginTop: 6 }}>
  <button
    style={{ ...styles.blueBtn, width: '100%', opacity: 0.7 }}
    onClick={() => {
      if (partido.estado === 'cerrado') {
        alert("Partido cerrado")
        return
      }

      registrarGol('A', {
        nombre: 'Desconocido',
        usuario_id: null
      })
    }}
  >
    ➕ Desconocido
  </button>
</div>

        <div style={styles.teamBox}>
          <h3>RED</h3>
          {jugadoresB.map((j, i) => (
  <div
    key={i}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }}
  >
    {/* BOTÓN PARA GOL */}
    <button
      style={{ ...styles.redBtn, flex: 1 }}
      onClick={() => {
        if (partido.estado === 'cerrado') {
          alert("Partido cerrado")
          return
        }
        registrarGol('B', j)
      }}
    >
      {j.nombre}
    </button>

    {/* BOTÓN ADMIN ❌ */}
    {esAdmin && partido.estado === 'abierto' && (
      <button
        style={{
          background: 'black',
          border: 'none',
          color: 'white',
          borderRadius: 6,
          width: 20,
          height: 20,
          fontSize: 12,
          cursor: 'pointer'
        }}
        onClick={() => eliminarJugador(j.usuario_id)}
      >
        ❌
      </button>
    )}
  </div>
))}

{/* 🔥 BOTÓN DESCONOCIDO RED */}
<div style={{ marginTop: 6 }}>
  <button
    style={{ ...styles.redBtn, width: '100%', opacity: 0.7 }}
    onClick={() => {
      if (partido.estado === 'cerrado') {
        alert("Partido cerrado")
        return
      }

      registrarGol('B', {
        nombre: 'Desconocido',
        usuario_id: null
      })
    }}
  >
    ➕ Desconocido
  </button>
</div>

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
          : '¿Ya tienes cuenta? Inicia Sesión'}
      </button>
    </div>
  )
}

function Stats() {
  const [vista, setVista] = useState('resumen')
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

    {/* 🔘 BOTONES */}
    <div style={{
      display: 'flex',
      gap: 10,
      marginBottom: 20
    }}>
      <button onClick={() => setVista('resumen')}>🏠 Resumen</button>
      <button onClick={() => setVista('equipos')}>📊 Equipos</button>
      <button onClick={() => setVista('jugador')}>👤 Jugador</button>
    </div>

    {/* 🏠 RESUMEN */}
    {vista === 'resumen' && (
      <>
        <h3>🏆 Global Equipos</h3>
        {renderTabla('🌍 Global', tablaGlobal)}

        <h3 style={{ marginTop: 30 }}>🥇 Top 5 Jugadores</h3>

        {goleadores.slice(0, 5).map((g, i) => (
          <div key={i} style={{
            background: i === 0 ? '#FFD70033' : '#0006',
            padding: 10,
            margin: '5px 0',
            borderRadius: 8
          }}>
            #{i + 1} {g.nombre} - {g.goles} goles
          </div>
        ))}
      </>
    )}

    {/* 📊 EQUIPOS DETALLADO */}
    {vista === 'equipos' && (
      <>
        <h3>📊 Estadísticas Por Cancha</h3>

        {renderTabla('🏟️ Americano', tablaAmericano)}
        {renderTabla('🏟️ Colón', tablaColon)}
      </>
    )}

    {/* 👤 JUGADOR DETALLADO */}
    {vista === 'jugador' && (
      <JugadorDetalle goleadores={goleadores} />
    )}

  </div>
)
}

function JugadorDetalle({ goleadores }) {
  const [jugador, setJugador] = useState(null)

  return (
    <div>

      <h3>👤 Seleccionar Jugador</h3>

      <select
        style={{ padding: 10, marginBottom: 20 }}
        onChange={(e) => {
          const seleccionado = goleadores.find(g => g.nombre === e.target.value)
          setJugador(seleccionado)
        }}
      >
        <option value="">Seleccionar...</option>

        {goleadores.map((g, i) => (
          <option key={i} value={g.nombre}>
            {g.nombre}
          </option>
        ))}
      </select>

      {jugador && (
        <div style={{
          background: '#0006',
          padding: 15,
          borderRadius: 10
        }}>
          <h3>{jugador.nombre}</h3>

          <p>⚽ Goles: {jugador.goles}</p>
          <p>📊 Promedio: {jugador.promedio}</p>
          <p>🏟️ Americano: {jugador.americano}</p>
          <p>🏟️ Colón: {jugador.colon}</p>
        </div>
      )}

    </div>
  )
}

function Perfil() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [equipo, setEquipo] = useState(null)

  useEffect(() => {
    cargarPerfil()
  }, [])

const cargarPerfil = async () => {
  const { data: userData } = await supabase.auth.getUser()
  const u = userData?.user

  if (!u) {
    console.log("No hay usuario")
    return
  }

  setUser(u)

  // 🔥 traer goles
  const { data: goles, error: errorGoles } = await supabase
    .from('goles')
    .select('*')
    .eq('usuario_id', u.id)

  if (errorGoles) console.log("Error goles:", errorGoles)

  // 🔥 traer partidos
  const { data: partidos, error: errorPartidos } = await supabase
    .from('partidos')
    .select('id, cancha')

  if (errorPartidos) console.log("Error partidos:", errorPartidos)

  console.log("USER:", u)
  console.log("GOLES:", goles)
  console.log("PARTIDOS:", partidos)

  let total = 0
  let blue = 0
  let red = 0
  let americano = 0
  let colon = 0

  ;(goles || []).forEach(g => {
    total++

    if (g.equipo === 'A') blue++
    if (g.equipo === 'B') red++

    const partido = (partidos || []).find(p => p.id === g.partido_id)

    if (partido?.cancha === 'Americano') americano++
    if (partido?.cancha === 'Colon') colon++
  })

  setStats({
    total,
    blue,
    red,
    americano,
    colon
  })

  // 🔥 equipo preferido
  const { data } = await supabase
    .from('perfil_usuario')
    .select('*')
    .eq('usuario_id', u.id)
    .maybeSingle()

  setEquipo(data?.equipo_preferido || null)
}

  const guardarEquipo = async (eq) => {
    const user = (await supabase.auth.getUser()).data.user

    await supabase
      .from('perfil_usuario')
      .upsert({
        usuario_id: user.id,
        equipo_preferido: eq
      })

    setEquipo(eq)
  }

  if (!user || !stats) return <p>Cargando...</p>

const cardStat = {
  flex: 1,
  background: '#0006',
  padding: 15,
  borderRadius: 12,
  textAlign: 'center'
}
  
  return (
  <div>

    {/* 👤 HEADER */}
    <div style={{
      background: '#0006',
      padding: 20,
      borderRadius: 15,
      marginBottom: 20
    }}>
      <h2>
        👤 {user.user_metadata?.nombre || user.email}
      </h2>

      <p style={{ opacity: 0.8 }}>
        📧 {user.email}
      </p>
    </div>

    {/* ⚽ STATS */}
    <h3>⚽ Estadísticas</h3>

    <div style={{
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 10
    }}>

      <div style={cardStat}>
        <h3>⚽</h3>
        <p>{stats.total}</p>
        <small>Total</small>
      </div>

      <div style={{ ...cardStat, background: '#007bff33' }}>
        <h3>🔵</h3>
        <p>{stats.blue}</p>
        <small>BLUE</small>
      </div>

      <div style={{ ...cardStat, background: '#ff4d4d33' }}>
        <h3>🔴</h3>
        <p>{stats.red}</p>
        <small>RED</small>
      </div>

      <div style={cardStat}>
        <h3>🏟️</h3>
        <p>{stats.americano}</p>
        <small>Americano</small>
      </div>

      <div style={cardStat}>
        <h3>🏟️</h3>
        <p>{stats.colon}</p>
        <small>Colón</small>
      </div>

    </div>

    {/* ⭐ EQUIPO */}
    <div style={{ marginTop: 30 }}>

      <h3>⭐ Equipo Preferido</h3>

      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 10
      }}>

        <button
          style={{
            ...styles.blueBtn,
            flex: 1,
            opacity: equipo === 'A' ? 1 : 0.5,
            border: equipo === 'A' ? '2px solid white' : 'none'
          }}
          onClick={() => guardarEquipo('A')}
        >
          🔵 BLUE
        </button>

        <button
          style={{
            ...styles.redBtn,
            flex: 1,
            opacity: equipo === 'B' ? 1 : 0.5,
            border: equipo === 'B' ? '2px solid white' : 'none'
          }}
          onClick={() => guardarEquipo('B')}
        >
          🔴 RED
        </button>

      </div>

    </div>

  </div>
)
}

const styles = {
  bg: {
    backgroundImage: `url(${fondo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
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
    color: 'white',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
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
    borderRadius: 16,
    padding: 12,
    flex: '1 1 240px',
    maxWidth: 260,
  },
  row: {
    display: 'flex',
    gap: 4,
    marginTop: 6
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
  background: '#007bff',
  color: 'white',
  border: 'none',
  padding: '6px',
  borderRadius: 6,
  textAlign: 'center',
  flex: 1,
  fontSize: 12,
  cursor: 'pointer'
},
  redBtn: {
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  padding: '6px',
  borderRadius: 6,
  textAlign: 'center',
  flex: 1,
  fontSize: 12,
  cursor: 'pointer'
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
    justifyContent: 'center',
    gap: 40,
    marginTop: 40,
    flexWrap: 'wrap'
  },
  teamBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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

