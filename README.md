
<div align="center">

# 📍 SchoolTrack 📍

### Fullstack | Proyecto Educativo | API REST + Interfaz Móvil

Plataforma móvil integral desarrollada con **React native**, **Expo Go**, **ASP.NET Core** y **PostgreSQL** para la gestión logística del transporte escolar. Permite seguimiento GPS en tiempo real, administración de conductores, gestión de estudiantes, control de rutas y monitoreo de horarios para mejorar la seguridad y eficiencia del servicio. Conecta de forma segura a acudientes, conductores y administradores del colegio.

---

![Estado](https://img.shields.io/badge/STATUS-En%20Desarrollo-black?style=for-the-badge&logo=github)
![Licencia](https://img.shields.io/badge/Licencia-MIT-8a2be2?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo Go](https://img.shields.io/badge/Expo_Go-ffffff?style=for-the-badge&logo=expo&logoColor=black)
![ASP.NET](https://img.shields.io/badge/.NET_10-512BD4?style=for-the-badge&logo=dotnet)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)



</div>

---

# 📑 Contenido

- 🎯 Visión
- 🎯 Objetivos
- 🚨 Problema que Resuelve
- 👥 Usuarios del Sistema
- ⚙️ Funcionalidades Principales
- 🏗️ Arquitectura General
- 🧠 Backend
- 📱 Frontend
- 🗄️ Base de Datos
- 📋 Scrum
- 👥 Equipo
- 📄 Licencia

---

# 🎯 Visión

El proyecto consiste en el desarrollo de una plataforma móvil de alta escalabilidad diseñada para optimizar la seguridad y la gestión del transporte escolar. El sistema conecta en tiempo real a acudientes, conductores e instituciones educativas mediante herramientas de monitoreo y comunicación.

---

# 🎯 Objetivos

## Objetivo General

Diseñar e implementar una aplicación que permita realizar seguimiento en tiempo real a los vehículos escolares, garantizando la seguridad de los estudiantes y optimizando la gestión del transporte.

## Objetivos Específicos

- Permitir el seguimiento GPS en tiempo real.
- Mejorar la comunicación entre acudientes y conductores.
- Registrar eventos e incidencias del transporte.
- Centralizar la información de estudiantes, conductores y vehículos.
- Optimizar la gestión de rutas escolares.

---

# 🚨 Problema que Resuelve

Actualmente los padres de familia tienen poca visibilidad sobre el trayecto diario de sus hijos, generando incertidumbre respecto a horarios, ubicación y seguridad.

Adicionalmente, los colegios y transportadores carecen de herramientas centralizadas para registrar novedades y monitorear rutas en tiempo real.

SchoolTrack busca solucionar estos problemas mediante una aplicación móvil unificada, accesible y segura.

---

# 👥 Usuarios del Sistema

- 👨‍👩‍👧 Acudientes
- 🚌 Conductores
- 🏫 Instituciones Educativas
- 👨‍💼 Administradores

---

# ⚙️ Funcionalidades Principales

- Seguimiento GPS en tiempo real.
- Gestión de estudiantes.
- Gestión de conductores.
- Gestión de vehículos.
- Administración de rutas.
- Registro de eventos e incidencias.
- Panel administrativo.
- Autenticación y control de acceso por roles.
- Reconocimiento facial para control de asistencia/acceso al bus de los estudiantes.
- Sistema de somnolencia para el conductor.
- Notificación a los acudientes cuando el estudiante esté cerca de llegar a su respectiva parada ( 500m)

---
# 🏆 Resultado Esperado

Al finalizar los cincos Sprints el sistema permitirá:

-  Administración completa de usuarios y rutas.
-  Seguimiento GPS en tiempo real.
-  Monitoreo simultáneo de múltiples vehículos.
-  Registro digital de abordaje y entrega.
-  Notificaciones automáticas a los acudientes.
-  Dashboard administrativo con reportes históricos.
-  Plataforma segura mediante autenticación.
-  Tomar el registro de asistencia de los estudiante mediante reconocimiento facial.
-  Aplicar sistema de somnolencia para el conductor.


---

# 🏗️ Arquitectura General

```text
Frontend (React native + Expo Go)
          │
          ▼
 ASP.NET Core REST API
          │
          ▼
 Entity Framework Core
          │
          ▼
      PostgreSQL
```

---

# 🧠 Backend 


## Tecnologías

| Tecnología            | Uso            |
| --------------------- | -------------- |
| ASP.NET Core 10       | API REST       |
| Entity Framework Core | ORM            |
| PostgreSQL            | Persistencia   |
| Repository Pattern    | Acceso a datos |
| GitHub Actions        | CI/CD          |


# 📱 Frontend


## Tecnologías

| Tecnología            | Uso                                   |
| --------------------- | --------------------------------------|
|  React Native         | Framework para desarollar la app móvil|
|  Expo Go              | Compilar la app móvil                 |



---

# 🗄️ Base de Datos

## Motor de Base de Datos

| Configuración | Valor                  |
| ------------- | ---------------------- |
| Motor         | PostgreSQL             |
| Host          | schooltrack-db.c7meoui423f1.us-east-2.rds.amazonaws.com|
| Puerto        | 5432                   |
| Base de Datos | postgres |

## Entidades

```text
Rol
Usuario
Acudiente
Conductor
Estudiante
Vehiculo
Historial
```


## Tablas Configuradas

```csharp
DbSet<Rol>
DbSet<Usuario>
DbSet<Acudiente>
DbSet<Conductor>
DbSet<Estudiante>
DbSet<Vehiculo>
DbSet<Historial>
```

---



---




---

# 📋 Scrum

## Herramientas Utilizadas

- 🗃️ Trello: https://trello.com/b/pjIVoALO/seminarioii

- #️⃣ Slack: https://app.slack.com/client/T0C3QTGACQN/D0C4KLFBK0V

---

# ⏳ Estado del Proyecto

```text
🟡 En desarollo
```

---

# 👥 Equipo de Trabajo

| Rol                | Integrante             |
| ------------------ | -----------------------|
| Scrum Master       | Karol Caicedo          |
| Frontend Developer | Luisa                  |
| Frontend Developer | Karol Caicedo          |
| Backend Developer  | Dairon Valencia        |
| Backend Developer  | Elkin  Andres Chalarka |


---

# 📄 Licencia

Este proyecto es de uso académico y puede ser modificado para fines educativos.

```
```



