# Walvis 🐋

Una alternativa a Discord construida con Next.js y Supabase. Proyecto desarrollado en 6 días.

## ¿Qué es Walvis?

Walvis es una aplicación de mensajería en tiempo real estructurada en servidores y canales, con soporte para voz, video, mensajes directos y un sistema de personalización completo.

## Features

- **Autenticación** — registro e inicio de sesión con email
- **Servidores** — creá y personalizá servidores con icono, nombre y fondo de chat
- **Canales** — canales de texto y voz dentro de cada servidor
- **Chat en tiempo real** — mensajes con soporte para GIFs, emojis, adjuntos e imágenes
- **Menciones** — `@usuario` y `@everyone` con notificaciones y resaltado visual
- **Voz y video** — canales de voz y video en tiempo real con Stream
- **Mensajes directos** — DMs entre usuarios
- **Sistema de amigos** — solicitudes, aceptar/rechazar y lista de amigos
- **Roles personalizados** — creá roles con nombre, color y permisos por servidor
- **Notificaciones** — notificaciones push del navegador para menciones y mensajes nuevos
- **Personalización** — avatar, banner de perfil, color de nickname, tema claro/oscuro
- **Estado** — Disponible, Ausente, Do not disturb, Invisible

## Stack

| Tecnología | Uso |
|---|---|
| [Next.js 15](https://nextjs.org) | Framework frontend y API routes |
| [React 19](https://react.dev) | UI |
| [Supabase](https://supabase.com) | Base de datos, autenticación, storage y realtime |
| [Stream](https://getstream.io) | Voz y video en tiempo real |
| [Giphy](https://developers.giphy.com) | GIFs |
| [Tailwind CSS](https://tailwindcss.com) | Estilos |
| [Vercel](https://vercel.com) | Deploy |

## Instalación local

### 1. Cloná el repositorio
```bash
git clone https://github.com/tu-usuario/walvis.git
cd walvis
```

### 2. Instalá las dependencias
```bash
npm install
```

### 3. Configurá las variables de entorno

Creá un archivo `.env.local` en la raíz del proyecto:

### 4. Configurá Supabase

en el **SQL Editor** de supabase configura los parametros de la Base de datos.

### 5. Correlo localmente
```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.




## Estructura del proyecto
```
app/
├── (auth)/          # Login y registro
├── (main)/          # Layout principal con sidebar
│   ├── home/        # Lista de amigos y DMs
│   └── servers/     # Servidores y canales
├── api/             # API routes
└── settings/        # Ajustes de usuario

components/
├── chat/            # Mensajes, input, header de canal
├── dm/              # Mensajes directos
├── modals/          # Modales (crear servidor, canal, roles)
├── notifications/   # Sistema de notificaciones
├── providers/       # Stream y Theme providers
├── sidebar/         # ServerList, ChannelList, UserPanel
├── ui/              # Componentes reutilizables
└── voice/           # Canales de voz y video
```

## Licencia

MIT