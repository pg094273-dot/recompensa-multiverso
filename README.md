# Multiverso de Misiones 🌀

App de recompensas para niños con temática de multiverso (Dragon Ball, Campeones y Harry Potter). Todo funciona en un único archivo `index.html`: sin instalación, sin servidor y sin conexión.

## ✨ Qué incluye

- **Misiones diarias** por niño, con puntos y días de la semana.
- **Restar puntos** cuando una misión no se hace (botón `−`, una vez al día por misión).
- **Ruleta de retos** editable: añade, cambia o borra retos y sus puntos.
- **Premios** canjeables con puntos.
- **Niveles, insignias, rachas y gráfico** de los últimos 7 días.
- **Nombres editables** y **fotos personalizadas** para cada niño (desde la galería del móvil).
- **Reinicios de prueba**: reiniciar el día, reiniciar el progreso o restablecer todo.
- **Sonidos, vibración y PIN de padre** opcionales.
- Guarda todo automáticamente en el dispositivo (`localStorage`).

## 📱 Usarla en el iPhone / iPad

1. Publica el proyecto en GitHub Pages (ver abajo) o ábrelo desde cualquier servidor.
2. Abre la URL en **Safari**.
3. Toca **Compartir → Añadir a la pantalla de inicio**.
4. Se abrirá a pantalla completa como una app.

## 🚀 Publicar en GitHub Pages

```bash
cd "APP RECOMPENSAS NIÑOS"
git remote add origin https://github.com/TU-USUARIO/multiverso-misiones.git
git branch -M main
git push -u origin main
```

Después, en GitHub: **Settings → Pages → Branch: main → /(root)**. La app quedará en:

```
https://TU-USUARIO.github.io/multiverso-misiones/
```

## 🛠️ Personalizar

- Todo el CSS y JavaScript está dentro de `index.html`.
- Los datos iniciales (misiones, premios, retos y avatares) están al principio del `<script>`.
- Para volver al estado de fábrica usa **Ajustes → Restablecer todo**.

## 📂 Archivos

| Archivo | Uso |
| --- | --- |
| `index.html` | La app completa |
| `manifest.webmanifest` | Datos de instalación (PWA) |
| `icon.svg`, `icon-180.png`, `icon-512.png` | Iconos de la app |
