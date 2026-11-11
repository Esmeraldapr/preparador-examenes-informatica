Esta es la clase 6 de Fundamentos Físicos y Electrónica, grabada por el profesor Diego Sandoval. Es la primera parte de la Unidad 5: circuitos de corriente alterna. Dura unos 25 minutos. Aquí está ordenado y explicado todo lo que dijo, con sus 18 diapositivas y dibujos con números. El temario de la UD5 todavía no está en el campus: esta clase va un poco por delante.

## Lo que avisó el profe al empezar

- Empieza la Unidad 5 antes de tiempo, para que en las dos últimas clases quede tiempo para resolver dudas.
- Igual que la unidad anterior, la divide en dos partes porque es mucho contenido. Esta es la parte 1. La parte 2 será la semana que viene.
- Quiere que se entienda, no solo aprobar el examen.
- En esta parte se ve todo en el dominio del tiempo (ondas que cambian con el tiempo). Al final da una pincelada del dominio fasorial (vectores).
- Lo que pidió aprender de memoria: la diferencia entre valor pico, valor eficaz y valor medio.
- Al final avisó: es contenido denso, la siguiente clase también lo será, y en la parte 2 hará ejercicios.

> En el examen: En los 7 exámenes oficiales de Fundamentos registrados hay 27 preguntas de la UD5. De lo que se vio en esta clase han caído: qué mide el valor eficaz (3 veces), la corriente adelanta en el condensador (3), circuito R en fase (2), reconocer R, C y L por las gráficas (2), el condensador deja pasar la alterna (2), por qué se usa la alterna (2), el generador se basa en Faraday (1), qué es un fasor (1), desfase positivo (1) y la derivada de un seno (1). Las demás (impedancia, circuito RLC, Laplace: 9) son de la parte 2.

![Portada: Circuitos de corriente alterna, unidad 5, parte 1](img/ffe-clase6-diapo-01-portada.jpg)

> Lo que pone la diapositiva: Universidad Isabel I. Unidad didáctica 5, parte 1. Circuitos de corriente alterna. Fundamentos Físicos y Electrónica. Desarrollo: corriente alterna en el dominio del tiempo.

![Índice: por qué alterna, generadores, corrientes y tensiones alternas, R, L y C en el tiempo](img/ffe-clase6-diapo-02-indice.jpg)

> Lo que pone la diapositiva: ¿Qué vamos a estudiar? 5.1 ¿Por qué se usa la corriente alterna? Ventajas frente a la continua. 5.2 Generadores de alterna: principio de funcionamiento. 5.3 Corrientes y tensiones alternas: sinusoides, parámetros y fasores (intro). 5.4 y 5.5 R, L y C en el dominio del tiempo: relación v–i en régimen permanente.

## Primero: qué es la corriente alterna

### La idea desde cero

En la UD2 vimos la corriente continua: la de una pila. Siempre va en el mismo sentido y con el mismo valor. Si una pila es de 9 V, son 9 V todo el rato.

La corriente alterna es la del enchufe de casa. Cambia de sentido muchas veces por segundo. Sube, baja, se hace negativa y vuelve a subir. Su dibujo es una ola: la onda seno (sinusoide).

En España cambia 50 veces por segundo: son 50 Hz. En América suelen ser 60 Hz. La frecuencia de la red es siempre fija.

- Continua (CC o DC): pila, batería, placa solar. Línea recta.
- Alterna (CA o AC): enchufe, red eléctrica. Ola que sube y baja.

## 5.1 ¿Por qué se usa la corriente alterna? La guerra de las corrientes

### Lo que contó el profe

Entre 1880 y 1890, más o menos, hubo una «guerra de las corrientes» entre dos inventores:

- Nikola Tesla, a favor de la corriente alterna.
- Thomas Alva Edison, a favor de la corriente continua, porque todos sus inventos funcionaban con continua.

![Fotos de Nikola Tesla y Thomas A. Edison](img/ffe-clase6-diapo-03-guerra-fotos.jpg)

![Tabla: corriente alterna (Tesla) frente a corriente continua (Edison)](img/ffe-clase6-diapo-04-tabla-ca-cc.jpg)

> Lo que pone la diapositiva: Corriente alterna (CA), Nikola Tesla, 1856–1943. Formación: ingeniería en la Escuela Politécnica de Graz. Empresa: licenció sus patentes a Westinghouse Electric. Sistema defendido: generación centralizada y transmisión en alta tensión. Dificultad: dudas sobre la seguridad de la alta tensión. Campaña de desprestigio: demostró su seguridad con corrientes de alta frecuencia. Resultado: estándar de la red eléctrica mundial. Corriente continua (CC), Thomas A. Edison, 1847–1931. Formación: autodidacta, casi sin escuela. Empresa: Edison Electric, origen de General Electric (1892). Sistema defendido: distribución en baja tensión desde estaciones locales. Limitación: pérdidas por efecto Joule (P = I²R) a distancia. Campaña de desprestigio: con H. P. Brown, electrocutó animales en público con CA. Resultado: vigente en HVDC, baterías y fotovoltaica. Abajo: la CA ganó porque el transformador permite subir la tensión y reducir las pérdidas por efecto Joule.

### Las dos ideas, en palabras sencillas

- Tesla: producir la electricidad en una central grande, subir mucho la tensión y llevarla lejos por cables de alta tensión.
- Edison: muchas centrales pequeñas repartidas por la ciudad, todas en baja tensión, cada una cerca de las casas.

Edison hizo una campaña contra la alterna para que pareciera peligrosa: electrocutó animales en público con corriente alterna. Aun así, ganó la alterna.

### El problema de la continua: el efecto Joule

Todo cable tiene un poco de resistencia. Cuando pasa corriente, el cable se calienta y se pierde energía en forma de calor. Eso es el efecto Joule (lo vimos en la UD2).

$ P_perdida = I^(2) · R :: la potencia que se pierde es la corriente al cuadrado por la resistencia del cable

Lo importante: la pérdida depende de la corriente AL CUADRADO. Si la corriente es el doble, se pierde 4 veces más.

### Ejemplo con números: por qué se sube la tensión

Queremos llevar 1000 W a una ciudad por un cable de 10 Ω.

La potencia es tensión por corriente:

$ P = V · I :: potencia igual a tensión por corriente

Así que la corriente es:

$ I = P ÷ V :: corriente igual a potencia entre tensión

Caso 1: lo mandamos a 230 V.

- I = 1000 ÷ 230
- I = 4,35 A
- Pérdida = I² · R
- Pérdida = 4,35² · 10
- Pérdida = 18,9 · 10
- Pérdida = 189 W

Caso 2: lo mandamos a 23 000 V (100 veces más tensión).

- I = 1000 ÷ 23 000
- I = 0,0435 A
- Pérdida = 0,0435² · 10
- Pérdida = 0,00189 · 10
- Pérdida = 0,019 W

Con 100 veces más tensión, la corriente es 100 veces menor. Y la pérdida es 100 · 100 = 10 000 veces menor.

![Mismos 1000 W: a 230 V se pierden 189 W, a 23 000 V solo 0,019 W](img/ffe-clase6-alta-tension.svg)

> Qué ves en el dibujo: Arriba, la línea a 230 V: corriente grande (4,35 A), cable gordo en rojo, se pierden 189 W en calor. Abajo, la misma energía a 23 000 V: corriente pequeñísima (0,0435 A), cable fino en verde, se pierden solo 0,019 W.

¿Y por qué eso favorece a la alterna? Porque subir y bajar la tensión en alterna es muy fácil: basta un transformador (dos bobinas cerca, lo vimos en la UD4). En continua eso era muy difícil en aquella época.

- En la central se SUBE la tensión para viajar lejos con poca corriente.
- Cerca de casa se BAJA otra vez a 230 V para usarla sin peligro.

> Recuerda: La CA se usa sobre todo porque con transformadores se sube la tensión, baja la corriente y se pierde mucho menos por efecto Joule.

### Otras ventajas de la alterna que dijo el profe

- Es mucho más sencilla de producir: los alternadores son giratorios y sencillos.
- Es más eficiente a larga distancia (lo de arriba).
- El profe la considera más segura porque la alterna pasa por cero continuamente. A 50 Hz pasa por cero 100 veces por segundo.

### Pero la continua no ha muerto: líneas HVDC

El profe insistió en esto porque casi nunca se cuenta. Cuando la distancia es enorme, llega un punto en que sale más barato llevar la energía en continua de alta tensión (HVDC).

![Gráfica: coste de la línea frente a la distancia, alterna (HVAC) y continua (HVDC)](img/ffe-clase6-diapo-05-coste-distancia.jpg)

> Lo que pone la diapositiva: Coste total relativo frente a distancia de transmisión (km). La línea continua (HVAC, alterna) empieza en 0,2 (subestaciones) y sube rápido. La línea discontinua (HVDC, continua) empieza en 0,5 (las conversoras son caras) pero sube más despacio. Se cruzan en el punto de equilibrio (d_BE), sobre los 700 km. Antes, CA más económica. Después, CC más económica. Imagen basada en un artículo científico (enlace abajo).

Cómo se lee la gráfica, paso a paso:

- En el kilómetro 0, la continua ya cuesta más (0,5 frente a 0,2), porque hacen falta estaciones conversoras.
- Pero cada kilómetro de continua es más barato: su línea sube más despacio.
- Donde se cruzan está el punto de equilibrio.
- Más allá de ese punto, la continua sale más barata.

Los tres países con más líneas de continua, según contó el profe:

- China: líneas de unos 1100 kV (más de un millón de voltios). Su tramo más largo, 3300 km. En total, casi 40 000 km.
- Brasil: líneas de 800 kV. Su tramo más largo, unos 2500 km. En total, 7500 km.
- India: líneas de 800 kV. Su tramo más largo, 1800 km. En total, 6500 km.

> En el examen: «¿Cuál es una ventaja de usar corriente alterna?» → facilidad de generación y transporte a altas tensiones (examen 2301140). «¿Cuál es una razón por la cual se usa corriente alterna?» → se puede generar y transportar fácilmente a altas tensiones, lo que reduce el efecto Joule (examen 2502310). Han caído 2 veces. Trampas: «no necesita transformadores» (al revés: los usa), «solo a bajas tensiones», «es más complicada de mantener».

## 5.2 Generadores de alterna

### Lo que contó el profe

Recordó que esto ya lo vimos en la UD4 (clases 4 y 5): el alternador. En una central hidroeléctrica el agua entra, hace girar las aspas de la turbina y eso mueve el generador.

![Central hidroeléctrica: embalse, entrada de agua, turbina, eje, rotor, estátor y generador](img/ffe-clase6-diapo-06-central-hidroelectrica.jpg)

> Lo que pone la diapositiva: 5.2 Generadores de alterna. Dibujo de una central: embalse, entrada de agua, turbina, carcasa, salida de agua, eje, rotor, estátor, excitatriz, generador síncrono de CA y salida de potencia de CA.

El profe enseñó una foto real con una persona al lado, para que veamos lo enorme que es.

![Foto real: un rotor de 249 toneladas bajando dentro del generador de una presa](img/ffe-clase6-diapo-07-rotor-real.jpg)

> Lo que pone la diapositiva: 5.2 Generadores de alterna. Foto de la instalación de un rotor de una central hidroeléctrica (Center Hill Dam). Fíjate en el operario de casco blanco a la derecha.

### Cómo sale la alterna de una espira que gira

Todo funciona igual: una espira gira dentro de un campo magnético B. El flujo que la atraviesa cambia según el ángulo. Por la ley de Faraday, si el flujo cambia, aparece una tensión (FEM).

![Espira girando: flujo y FEM a lo largo de una vuelta](img/ffe-clase6-diapo-08-espira-flujo-fem.jpg)

> Lo que pone la diapositiva: 5.2 Generadores de alterna. Cinco posiciones de una espira que gira dentro de B, con su vector normal n. Debajo, dos curvas: Φ (flujo, roja) y ε (FEM, azul) frente al ángulo de rotación (o tiempo).

Lo explico vuelta a vuelta con 4 posiciones:

- 0°: la espira está de frente a B. La atraviesan todas las líneas. Flujo máximo. Pero en ese instante el flujo casi no cambia, así que la FEM es 0.
- 90°: la espira está de canto. No la atraviesa ninguna línea. Flujo 0. Pero aquí el flujo cambia lo más rápido posible, así que la FEM es máxima.
- 180°: otra vez de frente, pero dada la vuelta. Flujo máximo negativo. FEM 0.
- 270°: otra vez de canto. Flujo 0. FEM máxima negativa.
- 360°: vuelve al principio. Una vuelta = un ciclo de la onda.

![Mi dibujo: posición de la espira, flujo (rojo) y FEM (azul) en 0°, 90°, 180°, 270° y 360°](img/ffe-clase6-espira-giro.svg)

> Qué ves en el dibujo: Arriba, la espira vista desde un lado: cuadrado lila = de frente a B; raya = de canto. Abajo, el flujo (rojo) es máximo donde la espira está de frente. La FEM (azul) es máxima donde la espira está de canto. Cuando una curva está arriba del todo, la otra pasa por cero.

> Recuerda: Flujo máximo → FEM cero. Flujo cero → FEM máxima. La FEM depende de lo rápido que CAMBIA el flujo, no de cuánto flujo hay.

> En el examen: «El generador de FEM alterna basa su funcionamiento en…» → la ley de Faraday (examen 2312920). Trampas: Joule, Ampère, Biot y Savart. En la UD4 caen también preguntas del alternador: en qué posición se induce la FEM máxima (exámenes 12532 y 18220), sus partes (inductor e inducido) y la función del inductor.

## 5.3 La onda sinusoidal y sus partes

### Lo que contó el profe

Para analizar la alterna se escribe la onda en el dominio del tiempo. Lo mínimo para describirla: amplitud, frecuencia (o periodo), fase y, para la energía, el valor eficaz.

![Forma de onda sinusoidal: v(t) = Vm sen(ωt + φ) y sus seis partes](img/ffe-clase6-diapo-09-forma-onda.jpg)

> Lo que pone la diapositiva: 5.3 Corrientes y tensiones alternas. Forma de onda sinusoidal. v(t) = Vm sen(ωt + φ): tensión (o corriente) en el dominio del tiempo. Amplitud Vm: valor máximo de la onda. Pulsación ω: ω = 2πf (rad/s). Frecuencia f: ciclos por segundo (Hz). Fase φ: desplazamiento temporal inicial. Periodo T: T = 1/f (segundos). Valor eficaz: Vrms = Vm/√2.

$ v(t) = V_m · sen(ω·t + φ) :: v de t igual a V m por seno de omega por t más fi

Qué significa cada letra:

- v(t): la tensión en cada instante t. Cambia todo el rato.
- Vm: amplitud. El valor más alto de la ola. Se mide en voltios.
- ω (omega): pulsación o frecuencia angular. Lo rápido que gira, en radianes por segundo.
- t: el tiempo, en segundos.
- φ (fi): la fase. Dónde empieza la ola cuando t = 0. Si φ = 0, empieza en 0 y subiendo.
- f: frecuencia. Cuántas olas completas por segundo, en hercios (Hz).
- T: periodo. Cuánto tarda una ola completa, en segundos.

Las dos fórmulas que unen f, T y ω:

$ T = 1 ÷ f :: el periodo es uno entre la frecuencia

$ ω = 2 · π · f :: omega es dos pi por la frecuencia

### Ejemplo con números: el enchufe de España (50 Hz)

Periodo:

- T = 1 ÷ f
- T = 1 ÷ 50
- T = 0,02 s
- Es decir, 20 milisegundos por ola.

Pulsación:

- ω = 2 · π · f
- ω = 2 · 3,1416 · 50
- ω = 6,2832 · 50
- ω = 314,16 rad/s

### Ejemplo al revés: leer una fórmula

Nos dan v(t) = 325 · sen(314 · t). ¿Qué sabemos?

- Amplitud: el número de delante. Vm = 325 V.
- ω: el número que multiplica a t. ω = 314 rad/s.
- Frecuencia: f = ω ÷ (2 · π)
- f = 314 ÷ 6,2832
- f = 49,97 Hz, o sea, 50 Hz.
- Periodo: T = 1 ÷ 50
- T = 0,02 s.
- Fase: no hay nada sumado dentro del seno, así que φ = 0.

> Recuerda: Dentro del paréntesis está ω · t + φ. El número que va con la t es ω, no la frecuencia. Para sacar f hay que dividir entre 2π. Aquí falla mucha gente.

## Valor de pico, valor eficaz y valor medio (de memoria)

### Lo que pidió el profe

Lo dijo dos veces: «aprendedlo de memoria». No explicó de dónde salen las fórmulas (salen de integrales). Lo que quiere es que distingamos los tres valores.

![Media, eficaz y pico: qué es cada uno y su fórmula](img/ffe-clase6-diapo-10-pico-eficaz-medio.jpg)

> Lo que pone la diapositiva: 5.3 Valores característicos. Media, eficaz y pico. Valor de pico: Vm o Im; máximo absoluto de la onda; importante para el aislamiento. Valor eficaz (rms): Vrms = Vm/√2; misma potencia que una continua de ese valor; es el valor que marcan los polímetros en CA. Valor medio: en un periodo completo es 0; en medio periodo es 2Vm/π; útil en rectificación. Abajo, tres cuadros: VALOR PICO (Vp = Vmáx, amplitud máxima de la onda); VALOR RMS (Root Mean Square, valor cuadrático medio: la resistencia se calienta igual en continua que en alterna con ese valor; P = V²rms/R; Vrms = raíz de la media de v² = Vp/√2 ≈ 0,707 · Vp); VALOR MEDIO (rectificado: media aritmética del valor absoluto sobre medio ciclo; Vmed = 2·Vp/π ≈ 0,637 · Vp).

![Los cuatro valores dibujados sobre la onda: pico a pico, pico, RMS y medio](img/ffe-clase6-diapo-11-grafica-valores.jpg)

> Lo que pone la diapositiva: Sobre una onda: valor pico a pico Vp-p = 2 · Vp (de arriba abajo del todo); valor pico positivo Vp (arriba del todo); valor RMS Vrms = Vp/√2 ≈ 0,707 · Vp (línea azul); valor medio rectificado Vmed = (2/π) · Vp ≈ 0,637 · Vp (línea naranja). T marca el periodo.

### Los cuatro valores, uno a uno

1. Valor pico (Vp o Vm): lo más alto que llega la ola. Es el que importa para el aislamiento de los cables (que no salte una chispa).

$ V_p = V_m :: el valor pico es el valor máximo

2. Valor pico a pico (Vpp): desde lo más alto hasta lo más bajo.

$ V_pp = 2 · V_p :: pico a pico es dos veces el pico

3. Valor eficaz (Vrms): el pico dividido entre raíz de 2. Es el valor de continua que calentaría igual una resistencia. Es el que marca el polímetro y el que se usa siempre en ingeniería eléctrica.

$ V_rms = V_p ÷ √2 ≈ 0,707 · V_p :: el valor eficaz es el pico entre raíz de dos, más o menos cero coma siete por el pico

4. Valor medio: la media de la ola.

- En una ola completa es 0: lo de arriba y lo de abajo se anulan.
- En media ola (solo la parte de arriba) es 2 · Vp ÷ π.

$ V_med = 2 · V_p ÷ π ≈ 0,637 · V_p :: el valor medio es dos por el pico entre pi, más o menos cero coma seis por el pico

### Qué quiere decir RMS

RMS viene del inglés Root Mean Square: raíz de la media de los cuadrados. Se lee al revés de como se hace:

- 1. Square: elevas al cuadrado cada valor de la onda.
- 2. Mean: haces la media de esos cuadrados.
- 3. Root: haces la raíz cuadrada.

Por eso, en el examen, el valor eficaz es «la raíz cuadrada del valor cuadrático medio».

### Ejemplo con números: el enchufe de casa

Los 230 V del enchufe son el valor EFICAZ. Vamos a sacar los otros.

Valor pico:

- Vp = Vrms · √2
- Vp = 230 · 1,4142
- Vp = 325,3 V

Valor pico a pico:

- Vpp = 2 · Vp
- Vpp = 2 · 325,3
- Vpp = 650,5 V

Valor medio (media ola):

- Vmed = 2 · Vp ÷ π
- Vmed = 2 · 325,3 ÷ 3,1416
- Vmed = 650,5 ÷ 3,1416
- Vmed = 207,1 V

Valor medio en una ola completa: 0 V.

![Mi dibujo: el enchufe de casa con pico 325 V, eficaz 230 V, medio 207 V y pico a pico 650 V](img/ffe-clase6-pico-eficaz-medio.svg)

> Qué ves en el dibujo: La ola morada es la tensión del enchufe. La raya roja de arriba es el pico (325 V). La azul es el eficaz (230 V). La naranja, un poco más abajo, es el medio de media ola (207 V). La raya roja vertical va de −325 V a +325 V: el pico a pico (650 V). Fíjate en el orden: pico > eficaz > medio.

### Otro ejemplo: pico de 100 V

- Vrms = 100 ÷ 1,4142
- Vrms = 70,7 V
- Vmed = 2 · 100 ÷ 3,1416
- Vmed = 200 ÷ 3,1416
- Vmed = 63,7 V
- Vpp = 2 · 100
- Vpp = 200 V

> Recuerda: Para no liarte: 1 ÷ √2 ≈ 0,7 y 2 ÷ π ≈ 0,6. Siempre: pico (1) > eficaz (0,707) > medio (0,637). Todo vale igual para la corriente: Irms = Ip ÷ √2.

> En el examen: «¿Qué mide el valor eficaz de una señal alterna?» o «¿Cómo se mide el valor eficaz?» → la raíz cuadrada del valor cuadrático medio. Ha caído 3 veces (exámenes 2301140, 2401760 y 2415630). Las trampas son siempre las mismas: «el valor medio de la señal», «el pico máximo de la señal» y «el doble del valor medio».

## 5.3.3 Representación fasorial (introducción)

### Lo que contó el profe

Escribir ondas con senos en el tiempo es lioso. Como en la red la frecuencia es siempre la misma (50 Hz), se puede usar un truco: dibujar la onda como una flecha (un vector) que gira. Eso es un fasor. Solo hace falta saber dos cosas: lo larga que es la flecha (módulo) y su ángulo (fase).

![Sinusoide y vector giratorio: qué es un fasor y sus cuatro formas de escribirlo](img/ffe-clase6-diapo-12-sinusoide-vector.jpg)

> Lo que pone la diapositiva: 5.3.3 Representación fasorial (intro). Sinusoide ↔ vector giratorio. ¿Qué es una representación fasorial? Método matemático simplificado para analizar circuitos en CA; se describe la sinusoide como un vector giratorio; se representa por módulo y ángulo; facilita sumar ondas de la misma frecuencia. Notación habitual: se usan magnitud y fase; la magnitud es el valor RMS o el valor pico (según formato); la frecuencia angular ω es constante para el sistema; misma frecuencia → se trabaja en estático. V = Vrms∠φ ⇔ V = Vrms·e^(jφ) ⇔ V = Vx + jVy ⇔ V = Vrms·cos(φ) + j·Vrms·sen(φ): notación polar o exponencial. NOTA: en ingeniería eléctrica se usa casi siempre el valor eficaz Vrms para facilitar los cálculos de potencia activa y reactiva.

### Para qué sirve, según el profe

- Es más compacto: solo módulo y ángulo.
- Facilita sumar ondas de la misma frecuencia.
- Como todas tienen la misma frecuencia, es como trabajar «en estático», con flechas quietas.

### Las formas de escribir un fasor

- Polar: V = 230∠30° (módulo 230, ángulo 30°). Es la que más vamos a usar.
- Exponencial: V = 230 · e^(j30°). Es lo mismo escrito con el número e (Euler).
- Rectangular (binómica): V = Vx + j·Vy. Vx es el trozo en el eje horizontal (parte real) y Vy en el vertical (parte imaginaria). La j marca la parte imaginaria.

### Ejemplo con números: pasar de polar a rectangular

V = 230∠30°

Parte real (eje X):

- Vx = 230 · cos(30°)
- Vx = 230 · 0,866
- Vx = 199,2

Parte imaginaria (eje Y):

- Vy = 230 · sen(30°)
- Vy = 230 · 0,5
- Vy = 115

Resultado:

- V = 199,2 + j·115

> En el examen: «Un fasor es un número complejo que representa…» → la amplitud y la fase de una señal sinusoidal (examen 2312920). La trampa: solo la amplitud, o solo la fase. Son las dos a la vez.

## 5.4 Comportamiento de R, C y L: quién gasta y quién guarda energía

### Lo que contó el profe

En un circuito hay corriente, tensión y el elemento. Cómo se portan la corriente y la tensión depende del elemento.

- Resistencia: se opone al paso de la corriente, gasta un poco de energía en calor (Joule) y ya está. No guarda nada. Esa energía gastada es la potencia activa.
- Condensador: guarda energía en su campo ELÉCTRICO. No la gasta (si es ideal).
- Bobina: guarda energía en su campo MAGNÉTICO. Tampoco la gasta.

La energía que el condensador y la bobina guardan y devuelven a la fuente, una y otra vez, es la potencia reactiva. Esta diferencia es la base para entender la potencia activa y la reactiva (parte 2).

![Comportamiento de R, C y L con sus fórmulas y sus fasores](img/ffe-clase6-diapo-13-comportamiento-rcl.jpg)

> Lo que pone la diapositiva: 5.4 Relación tensión–corriente. Comportamiento de R, C y L. Resistencia R: V = R·I; V e I en fase; disipa potencia activa; no almacena energía. Condensador C: I = C·dv/dt; I adelanta a V en 90°; almacena energía eléctrica; impide cambios bruscos de V. Bobina L: V = L·di/dt; I atrasa a V en 90°; almacena energía magnética; impide cambios bruscos de I. Abajo, tres diagramas: en R, la corriente y la tensión van juntas por el eje real; en C, con la corriente de referencia en el eje real, la tensión V_C apunta hacia abajo (−90°, retrasa); en L, la tensión V_L apunta hacia arriba (+90°, adelanta).

> Recuerda: Los tres diagramas dicen lo mismo de dos maneras. En C, «la corriente adelanta 90°» es igual que «la tensión retrasa 90°». En L, «la corriente atrasa 90°» es igual que «la tensión adelanta 90°».

## 5.5.1 Circuito con solo una resistencia (R)

### Lo que contó el profe

La resistencia mantiene la fase: la corriente va a la par que la tensión. Consume un poco de energía por Joule y ya está.

![Circuito R: la corriente sale igual que la tensión, en fase](img/ffe-clase6-diapo-14-circuito-r.jpg)

> Lo que pone la diapositiva: 5.5.1 Circuito R (dominio del tiempo). Régimen permanente sinusoidal. v(t) = Vm sen(ωt) → i(t) = (Vm/R) sen(ωt). Misma fase: φ = 0. Observaciones: la forma de onda de i es idéntica a la de v; solo cambia la escala (factor 1/R); potencia media P = Vrms · Irms. En la práctica: resistencias, calefactores, lámparas; no hay desfase ni potencia reactiva; es la referencia para comparar L y C.

$ i(t) = (V_m ÷ R) · sen(ω·t) :: la corriente es la tensión máxima entre R, por el mismo seno

Es la ley de Ohm de la UD2, I = V ÷ R, pero en cada instante.

### Ejemplo con números

Enchufe (Vm = 325 V) y una resistencia de 100 Ω.

Corriente máxima:

- Im = Vm ÷ R
- Im = 325 ÷ 100
- Im = 3,25 A

La corriente queda:

- i(t) = 3,25 · sen(314 · t)
- Mismo seno, mismo ω, misma fase. Solo cambia el tamaño.

Potencia media (con valores eficaces):

- Irms = Vrms ÷ R
- Irms = 230 ÷ 100
- Irms = 2,3 A
- P = Vrms · Irms
- P = 230 · 2,3
- P = 529 W

> En el examen: «¿Qué conclusión se obtiene en un circuito R en relación con la corriente y la tensión?» → «la corriente es igual a la tensión y tienen la misma frecuencia y fase». Ha caído 2 veces (exámenes 2401760 y 2502310). Ojo: la frase «la corriente es igual a la tensión» suena rara, pero es la respuesta correcta en los dos exámenes: quiere decir que tienen la misma forma y van a la vez. Las trampas: «frecuencias diferentes», «inversamente proporcional», «no están relacionadas».

## 5.5.2 Circuito con solo un condensador (C)

### Lo que contó el profe

El condensador guarda energía de forma eléctrica. Idealmente no gasta energía: intercambia energía con la fuente. Eso es potencia reactiva capacitiva. Y la corriente se adelanta 90° a la tensión.

![Circuito C: la corriente adelanta 90° a la tensión](img/ffe-clase6-diapo-15-circuito-c.jpg)

> Lo que pone la diapositiva: 5.5.2 Circuito C (dominio del tiempo). La corriente adelanta 90° a la tensión. v(t) = Vm sen(ωt) → i(t) = ωC·Vm cos(ωt). I adelanta a V en π/2. Interpretación: i = C dv/dt → la derivada de un seno es un coseno; la amplitud de i crece con ω y con C; a baja frecuencia el condensador «aísla» más. Energía: no disipa potencia media (ideal); intercambia energía con la fuente; potencia reactiva capacitiva.

### Por qué se adelanta: la derivada

En el condensador, la corriente depende de lo rápido que cambia la tensión:

$ i = C · dv/dt :: la corriente es la capacidad por la derivada de la tensión respecto al tiempo

dv/dt es «cuánto cambia la tensión en cada instante». Y la derivada de un seno es un coseno. El coseno es el mismo seno, pero empezando 90° antes (un cuarto de ola antes).

Míralo con la ola:

- Cuando la tensión pasa por 0 subiendo, es cuando más rápido cambia. Ahí la corriente es máxima.
- Cuando la tensión está arriba del todo, un instante se queda quieta. Ahí la corriente es 0.
- Así que la corriente llega a su máximo un cuarto de ola ANTES que la tensión.

$ i(t) = ω · C · V_m · cos(ω·t) :: la corriente es omega por C por V m por coseno de omega t

### Ejemplo con números: la frecuencia importa

Condensador de 10 µF (0,00001 F) en el enchufe (Vm = 325 V).

A 50 Hz:

- ω = 314,16 rad/s
- ω · C = 314,16 · 0,00001
- ω · C = 0,0031416
- Im = 0,0031416 · 325
- Im = 1,02 A

Si la frecuencia fuera 500 Hz (10 veces más):

- ω = 2 · 3,1416 · 500
- ω = 3141,6 rad/s
- ω · C = 3141,6 · 0,00001
- ω · C = 0,031416
- Im = 0,031416 · 325
- Im = 10,2 A

Diez veces más frecuencia → diez veces más corriente. La corriente crece con la frecuencia y con C.

¿Y en continua? La continua tiene frecuencia 0. Entonces ω = 0 y la corriente es 0. Por eso, en la UD2, el condensador en continua era un circuito abierto. A baja frecuencia, el condensador «aísla».

> Recuerda: El condensador SÍ deja pasar la alterna: se carga y se descarga sin parar. Lo que no deja pasar es la continua.

> En el examen: Han caído 3 veces que en un condensador la corriente se adelanta a la tensión, en π/2 o 90° (exámenes 2312920, 2401760 y 2415630). Trampas: «en fase», «retraso de π/2», «fase opuesta», «frecuencias diferentes». También 2 veces que el condensador permite el paso de la alterna (2301140; y 12532, donde la correcta es la del condensador que se carga y descarga y presenta reactancia capacitiva). Y 1 vez que la derivada y la integral de una sinusoide son otra sinusoide de la misma frecuencia (2401760).

## 5.5.3 Circuito con solo una bobina (L)

### Lo que contó el profe

En la bobina pasa al revés que en el condensador. La corriente se atrasa 90° respecto a la tensión. La bobina no gasta potencia: guarda energía en el campo magnético. Eso es potencia reactiva inductiva. Dijo que son complementarios: lo que hace uno, el otro lo hace al revés.

![Circuito L: la corriente atrasa 90° a la tensión](img/ffe-clase6-diapo-16-circuito-l.jpg)

> Lo que pone la diapositiva: 5.5.3 Circuito L (dominio del tiempo). La corriente atrasa 90° a la tensión. v(t) = Vm sen(ωt) → i(t) = −(Vm/ωL) cos(ωt). I atrasa a V en π/2. Interpretación: v = L di/dt → i es la integral de v; la amplitud de i baja si ω o L aumentan; a alta frecuencia la bobina «aísla» más. Energía: no disipa potencia media (ideal); almacena energía en el campo B; potencia reactiva inductiva.

$ v = L · di/dt :: la tensión es la inductancia por la derivada de la corriente

Aquí es la tensión la que depende de lo rápido que cambia la corriente (es la autoinducción de la UD4). Dicho al revés: la corriente es la integral de la tensión. Y la corriente llega a su máximo un cuarto de ola DESPUÉS que la tensión.

$ i(t) = −(V_m ÷ (ω · L)) · cos(ω·t) :: la corriente es menos V m entre omega por L, por coseno de omega t

### Ejemplo con números: la frecuencia importa (al revés)

Bobina de 0,1 H en el enchufe (Vm = 325 V).

A 50 Hz:

- ω · L = 314,16 · 0,1
- ω · L = 31,416
- Im = 325 ÷ 31,416
- Im = 10,3 A

A 500 Hz:

- ω · L = 3141,6 · 0,1
- ω · L = 314,16
- Im = 325 ÷ 314,16
- Im = 1,03 A

Diez veces más frecuencia → diez veces MENOS corriente. A alta frecuencia la bobina «aísla». Justo lo contrario que el condensador.

## Resumen de desfases y la regla CIVIL

![Resumen de desfases en el dominio del tiempo y regla CIVIL](img/ffe-clase6-diapo-17-resumen-desfases.jpg)

> Lo que pone la diapositiva: Resumen de desfases en el dominio del tiempo. Resistencia R: V e I en fase (φ = 0); solo potencia activa. Condensador C: I adelanta a V en 90°; potencia reactiva capacitiva. Bobina L: I atrasa a V en 90°; potencia reactiva inductiva. Regla práctica: CIVIL: en C, I antes que V; en L, V antes que I.

- Resistencia: tensión y corriente en fase. Solo potencia activa (también se llama potencia real).
- Condensador: la corriente adelanta 90° a la tensión. Potencia reactiva capacitiva.
- Bobina: la corriente atrasa 90° a la tensión. Potencia reactiva inductiva.

![Mi dibujo: en R las dos ondas suben a la vez; en C la corriente llega antes; en L llega después](img/ffe-clase6-desfases-rcl.svg)

> Qué ves en el dibujo: Morado = tensión. Verde = corriente. El punto marca el primer máximo de cada una. En R, los dos puntos están uno encima del otro. En C, el punto verde está a la izquierda: la corriente llega antes. En L, el punto verde está a la derecha: la corriente llega después.

### La regla CIVIL (truco del profe para no olvidarlo)

Lee la palabra C-I-V-I-L de izquierda a derecha:

- C-I-V: en el Condensador, la I va antes que la V.
- V-I-L: en la bobina (L), la V va antes que la I.

![Mi dibujo: la palabra CIVIL con sus dos mitades](img/ffe-clase6-civil.svg)

> Qué ves en el dibujo: La palabra CIVIL. El arco de la izquierda une C-I-V: en C, la corriente (I) va antes que la tensión (V). El arco de la derecha une V-I-L: en L, la tensión (V) va antes que la corriente (I).

### Cómo reconocer R, C o L en una gráfica (así cae en el examen)

- 1. Busca el primer máximo (la cima) de la corriente i y el de la tensión v.
- 2. Si están a la vez → R.
- 3. Si la cima de i va antes (más a la izquierda) → C.
- 4. Si la cima de v va antes → L.

Lo mismo con un desfase escrito: si v(t) = V0·sen(ωt + φ) e i(t) = I0·sen(ωt + ϕ), y la fase de la corriente es mayor (desfase positivo), la corriente va por delante: llega antes a sus máximos.

> En el examen: Reconocer los tres circuitos por sus gráficas ha caído 2 veces: en el 12532 (1 = C, 2 = R, 3 = L) y en el 18220 (la corriente llega a su máximo antes que la tensión → circuito C). En el 2502310: «¿Qué sucede cuando el desfase es positivo?» → la corriente precede a la tensión y alcanza valores máximos antes.

## Ideas clave de la parte 1

![Ideas clave de la parte 1](img/ffe-clase6-diapo-18-ideas-clave.jpg)

> Lo que pone la diapositiva: Ideas clave de la Parte 1. 1) La CA se usa sobre todo por el transporte eficiente con transformadores. 2) Un generador de alterna se basa en la inducción (Faraday) en una bobina giratoria. 3) La onda se describe por amplitud, frecuencia, fase y valor eficaz (Vrms = Vm/√2). 4) En R: V e I en fase. En C: I adelanta 90°. En L: I atrasa 90°.

- 1. La alterna se usa porque con transformadores se sube la tensión, baja la corriente y se pierde menos por Joule. Para distancias enormes, la continua (HVDC) sale más barata.
- 2. El generador de alterna es una espira o bobina que gira en un campo magnético: ley de Faraday.
- 3. La onda: v(t) = Vm · sen(ωt + φ). T = 1 ÷ f. ω = 2πf.
- 4. De memoria: pico = Vm; eficaz = Vm ÷ √2 ≈ 0,707 · Vm; medio = 2 · Vm ÷ π ≈ 0,637 · Vm (en una ola completa, 0).
- 5. Fasor = flecha con módulo y ángulo. Representa la amplitud y la fase.
- 6. R en fase (potencia activa). C: la corriente adelanta 90°. L: la corriente atrasa 90° (potencia reactiva). Regla CIVIL.

## Lo que viene en la parte 2 (la semana que viene)

El profe no lo explicó todavía, así que no hace falta agobiarse. Pero en los exámenes oficiales registrados de la UD5 hay 9 preguntas de esa parte:

- La impedancia del circuito RLC en serie: Zeq = R + j(ωL − 1/(ωC)). Ha caído 3 veces.
- La relación entre tensión y corriente en régimen permanente sinusoidal se llama impedancia. 2 veces.
- La impedancia combina resistencia, inductancia y capacitancia. 2 veces.
- La transformada de Laplace: pasa el circuito al dominio de la frecuencia, y las impedancias con «s». 2 veces.

Cuando el profe dé la parte 2, se meterá aquí como clase 7.