// Aquí puedes añadir funciones extra si necesitas interactividad personalizada
console.log("Abierto Pampeano cargado correctamente.");


  document.addEventListener('DOMContentLoaded', function () {
    const navbarCollapse = document.getElementById('navbarNav');
    const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });

    document.querySelectorAll('#navbarNav .nav-link').forEach(function (navLink) {
      navLink.addEventListener('click', function () {
        if (navbarCollapse.classList.contains('show')) {
          bsCollapse.hide();
        }
      });
    });
  });


// JS Contador 
const fechaEvento = new Date("October 11, 2025 09:00:00").getTime();

const actualizarContador = setInterval(() => {
    const ahora = new Date().getTime();
    const distancia = fechaEvento - ahora;

    if(distancia < 0){
        clearInterval(actualizarContador);
        document.querySelector(".contador-container").innerHTML = "<p>¡El evento ya comenzó!</p>";
        return;
    }

    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

    document.getElementById("dias").innerText = dias;
    document.getElementById("horas").innerText = horas;
    document.getElementById("minutos").innerText = minutos;
    document.getElementById("segundos").innerText = segundos;
}, 1000);


// Contador de visitas sheet + ubicación y referrer
document.addEventListener("DOMContentLoaded", function() {
    const contadorVisitas = document.getElementById("contador-visitas");

    // Obtenemos ubicación aproximada usando GeoIP
    fetch("https://ipapi.co/json/")
        .then(res => res.json())
        .then(locationData => {
            const ciudad = locationData.city || "Desconocida";
            const provincia = locationData.region || "Desconocida";
            const referrer = document.referrer || "Directo";

            // Enviar datos al Web App de Google Apps Script
            fetch("https://script.google.com/macros/s/AKfycbzNmHcMgrRGUeSGlCxOkqs2Sh4e9xfhfgWedizKPKZ1Zs-xG5aRS8LYyBRjPZwCp7-o/exec", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "visita",
                    ciudad: ciudad,
                    provincia: provincia,
                    referrer: referrer
                })
            })
            .then(response => response.json())
            .then(data => {
                // Actualizamos el contador en la web
                contadorVisitas.textContent = data.value;
            })
            .catch(err => {
                console.error("Error al actualizar contador:", err);
                contadorVisitas.textContent = "–";
            });
        })
        .catch(err => {
            console.error("Error obteniendo ubicación:", err);
            contadorVisitas.textContent = "–";
        });
});


// Efecto de transición al scrollear
const secciones = document.querySelectorAll("section");

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        } 
        // Si querés que desaparezca al salir del viewport, descomenta:
        // else { entry.target.classList.remove("visible"); }
    });
}, { threshold: 0.2 }); // cuando 20% de la sección sea visible

secciones.forEach(section => observer.observe(section));