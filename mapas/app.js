
let siteDict = {};

function escribeFecha() 
{

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dias = ["Domingo", "Lunes", "Martes", "Mi&eacutercoles", "Jueves", "Viernes", "S&aacutebado", "Domingo"];
    let hoy = new Date().getHours();
    let ampm = "AM";

    if(hoy > 11)
    {
        ampm = "PM";
    }

    if(hoy > 12)
    {
        hoy -= 12;
    }

    function addZero(i) {
        if (i < 10) {i = "0" + i}
        return i;
    }

    fecha_hoy = dias[new Date().getDay()] + " " + new Date().getDate() + " de " +  meses[new Date().getMonth()] 
                 + " de " + new Date().getFullYear()
                 + " a las " + hoy + ":" + addZero(new Date().getMinutes()) + " " + ampm;


    return fecha_hoy;         
}

function crearDiccionario()
{
    let url = "https://raw.githubusercontent.com/j-jimenezg/archivo_datos/main/embalses.json";

    Plotly.d3.json(url, function(data){
        for(let i=0; i< data.length; i++)
        {
            siteDict[data[i].siteID] = {nombre:data[i].nombre, 
                                        lat:data[i].latitude,
                                        lon: data[i].longitude, 
                                        seguridad: data[i].seguridad, 
                                        observacion: data[i].observacion,
                                        ajuste: data[i].ajuste,
                                        control: data[i].control,
                                        desborde: data[i].desborde};
        }
    
    
    });
}

function filtraDatos(data)
{
  let fecha = [];
  let nivel = [];
  const filtered = data.split('\n');
  let colNivel;
  for(let i=0;i < filtered.length;i++)
  {
    if (filtered[i].slice(0,9) == "agency_cd")
    {
       let header = filtered[i].split("\t");
       colNivel = header.findIndex(element => element.includes("_62616"))
     }
    if(filtered[i].slice(0,4) == "USGS")
    {
       let fila = filtered[i].split('\t');
       fecha.push(fila[2]);
       nivel.push(parseFloat(fila[colNivel]));
     }
  }


  return [fecha,nivel];
}

function trazaGrafica(x,y, titulo, num)
{
    Plotly.newPlot('plot', [{
        x: x,
        y: y,
        line : {
            color: 'red'
        }
    }], {
        autosize: false,
        width: 250, 
        height: 200, 
        plot_bgcolor: "rgb(221,221,221)",
        paper_bgcolor: "rgb(164,218,232)",
        margin : {
           l: 50,
           r: 20,
           b: 45,
           t: 55,
           pad: 4
        },
        xaxis: {
            gridcolor: "rgb(128,128,128)",
            title: "Fecha/Hora",
            showline:true, 
            linecolor: 'black', 
            mirror: true
            
        },
        yaxis: {
            gridcolor: "rgb(128,128,128)",
            title: "Nivel [m]",
            showline:true, 
            linecolor: 'black', 
            mirror: true
            
        },
        title: '<b>' + titulo + '</b>' + '<br>' + 
                            '<b>' + "Nivel actual: " + '</b>' + y[y.length-1].toFixed(2) + " metros",
        font: {
            family: 'Arial',
            size: 10,
            color: 'black'
        }
    }, config = {responsive: true});

}

function escogeColor(nivel, des, con, seg, ajus, obs) {
    

    let color_codigo = ' ';

     if(nivel >= des) 
     {
         color_codigo = '#9C2BCB';
     }
     if(nivel >= seg && nivel < des)
     {
         color_codigo = 'green';
     }
     else if(nivel >= obs && nivel < seg)
     {
         color_codigo = 'blue';
     }
     else if(nivel >= ajus && nivel < obs)
     {
         color_codigo = 'yellow';
     }
     else if (nivel < ajus){
         color_codigo = 'orange';
     }
     return color_codigo;
 }

function buscaFlecha(valor)
{
   let flecha = ' ';
   if (valor >= 0.009)
   {
       flecha = 'uparrow.png';
   }

   else if (valor <= -0.009)
   {
       flecha = 'dwarrow.png';
   }

   else if (valor > -0.009 && valor < 0.009)
   {
       flecha = 'rarrow.png';
   }
   return flecha;
}

function buscaEmbalse(miEmbalse)
{

    Plotly.d3.text("https://waterdata.usgs.gov/pr/nwis/uv/?format=rdb&site_no=" + miEmbalse, function(data) {

    let datos = filtraDatos(data);

    let nombre = siteDict[miEmbalse].nombre;
    let lat = siteDict[miEmbalse].lat;
    let lon = siteDict[miEmbalse].lon;


     let nivel_actual = datos[1][datos[1].length-1].toFixed(2);
     let fecha_actual = datos[0][datos[0].length-1].slice(0,10);
     let index = 0;

     
    for(let i = datos[0].length - 1; i >= 0; i--)
    {
        if(datos[0][i] == fecha_actual + ' 00:00') // busca la posicion de las 12:00am del dia de hoy
        {
                index = i;
            
        }
    }
     
     let nivel_comp = datos[1][index].toFixed(2); // nivel a las 12:00am del dia de hoy
     let diferencia = nivel_actual-nivel_comp;

     let desborde = siteDict[miEmbalse].desborde;
     let control = siteDict[miEmbalse].control;
     let seguridad = siteDict[miEmbalse].seguridad;
     let ajuste = siteDict[miEmbalse].ajuste;
     let observacion = siteDict[miEmbalse].observacion;

     // borde del rectángulo
     let bounds = [[lat - 0.06, lon - 0.01], [lat + 0.05, lon + 0.02]];
     
     function normaliza_nivel(x){
         let norm = (x-control)/(desborde-control);
         norm = (norm * (bounds[1][0]-bounds[0][0])) + bounds[0][0];
         return norm;
     }

     
     let marker = new L.rectangle(bounds, {color: 'black', weight: 1.5, opacity: 0.8,//fillColor:escogeColor(nivel_actual, desborde, control, seguridad, ajuste, observacion), 
     fillOpacity: 0.2}).bindTooltip(nombre,
     {
         className: "etiqueta_div",
         offset: [0,30],
         permanent: true, 
         direction: 'bottom'
     }).addTo(mymap);

     
     let marker_nivel = new L.rectangle([[bounds[0][0],bounds[0][1]],[normaliza_nivel(nivel_actual),bounds[1][1]]],
                        {opacity: 0.0, 
                        fillColor: escogeColor(nivel_actual, desborde, control, seguridad, ajuste, observacion), 
                        fillOpacity: 0.6}).bindPopup('<div id = "plot"></div>', {maxWidth: "auto", offset:[-125,0]})
                        .on('popupopen', function(e) {
                            trazaGrafica(datos[0], datos[1], nombre, diferencia)
                        }).addTo(mymap);
     
    let linea_seg = new L.polyline([[normaliza_nivel(seguridad), bounds[0][1]], [normaliza_nivel(seguridad), bounds[1][1]]], {color:'black', weight: 1.2}).addTo(mymap);
    let linea_obs = new L.polyline([[normaliza_nivel(observacion), bounds[0][1]], [normaliza_nivel(observacion), bounds[1][1]]], {color:'black', weight: 1.2}).addTo(mymap);
    let linea_ajus = new L.polyline([[normaliza_nivel(ajuste), bounds[0][1]], [normaliza_nivel(ajuste), bounds[1][1]]], {color:'black', weight: 1.2}).addTo(mymap);
    
   
    
     let flecha_spec = L.icon({
        iconUrl: buscaFlecha(diferencia),
        iconSize:     [30, 25], //tamaño
        iconAnchor:   [12, 10], // punto del ícono que corresponde a la localización del marcador
        
    });

    let flecha_mapa = L.marker([lat + 0.075, lon], {icon: flecha_spec}).addTo(mymap);
    
   
    });
}


function procesaEmbalses()
{
  for (const [key, value] of Object.entries(siteDict))
  {
      buscaEmbalse(key);
  }
}



function inicializaMapa()
{
    let centro = [18.25178,-66.254513];

     mymap = L.map('mapid').setView(centro, 10);
     
     let atrib1 = 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">';
     let atrib2 = 'OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
     let atrib  = atrib1 + atrib2;
     
     let mytoken = 'pk.eyJ1Ijoiam9tYXJpZWppbWVuZXoiLCJhIjoiY2t6b2ZsYmNvMGg4NTJ4cTRkd3JoZG1pNSJ9.D_eiKzEXmVq4TOIpypeUIw';
     
     let myLayer = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}';
     
     L.tileLayer(myLayer, {
         attribution: atrib,
         maxZoom: 24,
         id: 'mapbox/light-v10',//'mapbox/satellite-v9',
         tileSize: 512,
         zoomOffset: -1,
         accessToken: mytoken}).addTo(mymap);

    let legend = L.control({ position: "bottomright"});
    let colores = ['#9C2BCB', 'green', 'blue', 'yellow', 'orange'];
    let etiquetas = ['Desborde', 'Seguridad', 'Observaci&oacuten', 'Ajuste', 'Control'];

    legend.onAdd = function(map) {
        let div = L.DomUtil.create("div", "legend");
    
        div.innerHTML = "<h4>Estado del embalse</h4>"
        for(let i = 0; i < colores.length; i++)
        {
            div.innerHTML += '<i style="background: ' + colores[i] + '"></i> ' + etiquetas[i] + '<br>';
      
        }
         
        return div;
    } 

    legend.addTo(mymap);
    
    let actualizacion = L.control({ position: "bottomleft"});
    actualizacion.onAdd = function(map) {
        let div_fecha = L.DomUtil.create("div", "myDate");
        div_fecha.innerHTML = 'Ultima Actualizaci&oacuten: '  + '<span>' + escribeFecha() + '</span>';

        return div_fecha;
    }

    actualizacion.addTo(mymap);

    let info_icon = L.icon({
        iconUrl: 'info_icon.png',
        iconSize:     [60, 60], //tamaño
        iconAnchor:   [12, 10], // punto del ícono que corresponde a la localización del marcador
        
    });

    let div_info = L.DomUtil.create("div", "info_div");
    div_info.innerHTML = '<h3>Informaci&oacuten</h3>' +
                         '<p>Esta aplicaci&oacuten permite visualizar el estado actual de los embalses en Puerto Rico, ' +
                         'seg&uacuten datos del Servicio Geol&oacutegico de los Estados Unidos (USGS).</p>' +
                         '<p> Cada rect&aacutengulo de color tiene una <span>altura</span> que corresponde al nivel actual ' + 
                         'del embalse. Las <span>flechas</span> indican la tendencia del nivel (a subir, a bajar o a permanecer ' +
                         'igual). Las l&iacuteneas en cada rect&aacutengulo corresponden a los estados mencionados en la leyenda del mapa. ' + 
                         'El c&oacutedigo de colores se basa en el de la Autoridad De Acueductos y ' +
                         'Alcantarillados de Puerto Rico.</p><br>';
    
    div_info.innerHTML += '<h3>C&oacutemo usar la aplicaci&oacuten </h3>' + 
                          '<p><b>Presione</b> cualquier rect&aacutengulo de color para ver la gr&aacutefica ' + 
                          'del nivel de ese embalse en los &uacuteltimos d&iacuteas.</p>';

    let info_popup = L.marker([18.682820, -65.720376], 
                    {icon: info_icon}).addTo(mymap)
                    .bindTooltip(div_info,{offset: [20,70], direction: 'bottom'});

    return mymap;
}

inicializaMapa();



crearDiccionario();

setTimeout(procesaEmbalses,500);




