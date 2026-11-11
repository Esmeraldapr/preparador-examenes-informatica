Esta es la clase 6 de Cálculo y Análisis Matemático, en directo con el profesor José María Torres Bruna, el 10 de noviembre. Es la Unidad 4: integrales y sus aplicaciones. Dura unos 45 minutos. Aquí está ordenado y explicado todo lo que hizo en la pizarra, paso a paso y con una cuenta en cada línea. Al final están los avisos del examen que dio.

## Lo que avisó el profe

- Con la UD4 se termina el análisis de funciones de una variable. Es un poco más que lo de bachillerato, pero no mucho más.
- Las unidades 1 a 4 van seguidas, una detrás de otra:
- UD1: funciones.
- UD2: límites y continuidad.
- UD3: derivadas (que se calculan con límites).
- UD4: integrales, que también se llaman antiderivadas o primitivas.
- Derivar es una técnica: con práctica derivas cualquier función. Integrar es más laborioso: hay que hacer muchos ejercicios «para pillar el truco».
- En el examen no ponen integrales muy complicadas ni muy largas. Si sabes la técnica, la ves rápido. Si no la sabes, no sirve darle vueltas.
- Las técnicas que hay que saber son tres: inmediatas, cambio de variable y por partes.

> En el examen: En los 6 exámenes oficiales de Cálculo registrados hay 30 preguntas de la UD4. Lo que más cae: área bajo una curva con números (6 veces), qué significa geométricamente la integral (4), integrales definidas con cambio de variable (4), «¿cuál NO es una aplicación de la integral?» (3) e integral de una función a trozos (3). En el Test no evaluable de la UD4 (29 preguntas): cambio de variable 7, inmediatas 7, regla de Barrow 6 y por partes 4. Las 4 de partes son justo los 4 ejemplos que hizo el profe en esta clase.

![Pizarra 1: el repaso de las unidades, las tres técnicas y el primer cambio de variable](img/cal-clase6-pizarra-01-esquema-y-cambio-ln.jpg)

> Lo que pone la pizarra: Integrales y sus aplicaciones. UD1 funciones; UD2 límites y continuidad; UD3 derivadas; UD4 integrales / antiderivadas / primitivas → suma. f(x) = e^(−x²). Tres técnicas: inmediatas, cambio de variable, integración por partes. ∫xⁿ dx = xⁿ⁺¹/(n+1) + C si n ≠ −1. Si n = −1: ∫(1/x) dx = ln(x). ∫cos x dx = sen(x) + C. ∫(1/x)·ln(x) dx con u = ln(x), du = (1/x) dx → ∫u du = ½u².

## Qué es una integral

### Dos ideas que tienen que quedar claras

El profe lo repitió varias veces:

- 1. La integral es la operación inversa de la derivada.
- 2. Una integral no es más que una suma.

### Idea 1: lo contrario de derivar

Derivar: te dan una función y sacas su derivada.

Integrar: te dan la derivada y tienes que encontrar la función de la que viene. Esa función se llama primitiva.

Ejemplo con números:

- La derivada de x² es 2x.
- Así que una primitiva de 2x es x².

### Por qué se pone «+ C»

La derivada de un número suelto es 0. Entonces:

- La derivada de x² es 2x.
- La derivada de x² + 5 también es 2x.
- La derivada de x² − 100 también es 2x.

Todas son primitivas de 2x. Por eso se escribe:

$ ∫ 2x dx = x^(2) + C :: la integral de dos x es x al cuadrado más una constante

C es «cualquier número». El profe dijo que a veces ni la escribe, pero siempre está.

> En el examen: «La solución a una integral indefinida…» → no es única (examen 12052), justo por la C. Y «La operación inversa de la integración es…» → la derivación (examen 12052).

### Idea 2: una suma de rectángulos

Para sacar el área que hay debajo de una curva, se rellena con rectángulos muy estrechos, de la altura de la función, y se suman. Si los rectángulos son infinitamente estrechos, esa suma infinita se escribe con el símbolo ∫ (una S alargada, de «suma»). Eso son las sumas de Riemann.

> En el examen: «Las sumas por defecto o por exceso para el área de un recinto se llaman sumas de…» → Riemann (Test no evaluable de la UD4).

### Una función sencilla que no se puede integrar

El profe puso el ejemplo de f(x) = e^(−x²). Parece fácil, pero su primitiva no se puede escribir con las funciones que conocemos (polinomios, exponenciales, logaritmos, senos…). Lo usó para decir que integrar no siempre sale: por eso en el examen ponen integrales que tienen truco conocido.

## Técnica 1: integrales inmediatas

Son las de la tabla de la unidad: se hacen «de memoria», derivando al revés.

### La potencia

$ ∫ x^(n) dx = x^(n+1) ÷ (n+1) + C :: la integral de x elevado a n es x elevado a n más uno, entre n más uno, más C

Se hace en dos pasos:

- 1. Al exponente le sumas 1.
- 2. Divides entre el exponente nuevo.

Ejemplo con x²:

- n = 2
- n + 1 = 3
- ∫ x² dx = x³ ÷ 3 + C

Ejemplo con x³:

- n = 3
- n + 1 = 4
- ∫ x³ dx = x⁴ ÷ 4 + C

Cómo comprobarlo (lo hizo el profe): derivas el resultado y te tiene que salir lo de dentro.

- Derivada de x⁴ ÷ 4
- = 4 · x³ ÷ 4
- = x³ ✔

### La única excepción: n = −1

Si n = −1, la fórmula daría dividir entre 0 (−1 + 1 = 0). Por eso hay una integral aparte:

$ ∫ (1 ÷ x) dx = ln(x) + C :: la integral de uno entre x es el logaritmo neperiano de x

Recuerda que 1 ÷ x es lo mismo que x^(−1). Esa es la que no cumple la regla de la potencia.

### Las otras inmediatas que nombró

- ∫ eˣ dx = eˣ + C. La exponencial se queda igual.
- ∫ cos(x) dx = sen(x) + C.
- ∫ sen(x) dx = −cos(x) + C. Ojo con el signo menos.
- ∫ 1 ÷ √(1 − x²) dx = arcsen(x) + C. Esta la demostró con un cambio de variable (más abajo).

> En el examen: En el Test no evaluable de la UD4 hay 7 inmediatas, por ejemplo ∫ ∛(x²) dx, ∫ 1/x⁴ dx o ∫ (3·eˣ − sen x) dx.

## Técnica 2: cambio de variable

### Cuándo se usa (la pista del profe)

Busca dentro de la integral una función y, a la vez, su derivada. Si están las dos, haz el cambio. El cambio sirve para simplificar lo que hay que integrar.

Los pasos, siempre los mismos:

- 1. Llamas u a la función de dentro.
- 2. Derivas: du = (derivada) · dx.
- 3. Cambias todo a u. Te queda una integral inmediata.
- 4. Integras.
- 5. Deshaces el cambio: vuelves a poner x. Aquí falla mucha gente: se les olvida.

### Ejemplo 1 del profe: ∫ (1/x) · ln(x) dx

Dentro hay ln(x). Y su derivada, 1/x, también está. Así que el cambio es:

- u = ln(x)
- du = (1/x) dx

Cambiamos:

- ∫ ln(x) · (1/x) dx
- = ∫ u du

Es una inmediata de potencia con n = 1:

- ∫ u du = u² ÷ 2 + C

Deshacemos el cambio (u = ln x):

- = (ln x)² ÷ 2 + C

Comprobación (la hizo el profe derivando con la regla de la cadena):

- Derivada de (ln x)² ÷ 2
- = 2 · ln(x) · (1/x) ÷ 2
- = ln(x) · (1/x) ✔

> En el examen: Esta misma integral está en el Test no evaluable de la UD4: «∫ ln(x)/x dx mediante cambio de variable» → (ln x)²/2.

### Ejemplo 2 del profe: ∫ cos(x) · e^(sen x) dx

Parece difícil (exponencial y trigonometría juntas). Pero dentro hay sen(x), y su derivada, cos(x), también está fuera.

- u = sen(x)
- du = cos(x) dx

Cambiamos:

- ∫ e^(sen x) · cos(x) dx
- = ∫ eᵘ du

Integramos (la exponencial se queda igual):

- = eᵘ + C

Deshacemos el cambio:

- = e^(sen x) + C

![Pizarra 2: el cambio de variable con e^(sen x) y la fórmula de partes](img/cal-clase6-pizarra-02-partes-formula.jpg)

> Lo que pone la pizarra: ∫(1/x)·ln(x) dx = ∫u du = ½u² = ½(ln x)² con u = ln(x). ∫cos(x)·e^(sen x) dx = ∫eᵘ du = eᵘ = e^(sen x), con u = sen(x), du = cos(x) dx. Abajo: ∫u dv = uv − ∫v du.

### El ejemplo que dejó para luego: ∫ x · e^(x²) dx

El profe dijo que esta sí sería cambio de variable, porque la derivada de x² es 2x y fuera hay una x. No la terminó; aquí está entera.

- u = x²
- du = 2x dx
- Fuera solo tenemos x dx, no 2x dx.
- Despejamos: x dx = du ÷ 2

Cambiamos:

- ∫ e^(x²) · x dx
- = ∫ eᵘ · du ÷ 2
- = ½ ∫ eᵘ du
- = ½ eᵘ + C

Deshacemos el cambio:

- = ½ e^(x²) + C

> Recuerda: Si a la derivada le falta un número (aquí el 2), se pone dividiendo fuera. Lo que no puede faltar es la x.

> En el examen: En los oficiales cae como integral definida: ∫ de 2 a 4 de 6x/(x² − 1) dx = 3·ln(5) (2 veces: 2200230 y 2500130) y ∫ de 0 a 1 de x³·e^(−x⁴) dx = (e − 1)/(4e) (2401480). En el Test no evaluable de la UD4 hay 7 de cambio de variable.

## Técnica 3: integración por partes

### La fórmula

$ ∫ u dv = u · v − ∫ v du :: la integral de u por diferencial de v es u por v menos la integral de v por diferencial de u

### De dónde sale (el truco del profe para no olvidarla)

Si no te acuerdas, sale de la derivada de un producto:

- d(u · v) = du · v + u · dv
- Pasamos du · v al otro lado:
- u · dv = d(u · v) − v · du
- Integramos todo:
- ∫ u dv = u · v − ∫ v du

Las letras dan igual: f y g, o lo que quieras.

### Cuándo se usa

Cuando hay dos funciones multiplicadas que «no casan»: una no es la derivada de la otra. Por eso no vale el cambio de variable. Con partes, una de ellas desaparece al derivarla.

### Ejemplo 1 del profe: ∫ x · eˣ dx

¿Por qué no es cambio de variable? Porque la derivada de x es 1, no eˣ. Las dos no casan.

Elegimos:

- u = x → al derivar: du = dx
- dv = eˣ dx → al integrar: v = eˣ

Aplicamos la fórmula:

- ∫ x · eˣ dx = u · v − ∫ v du
- = x · eˣ − ∫ eˣ dx
- = x · eˣ − eˣ + C

Sacando eˣ factor común:

- = (x − 1) · eˣ + C

![Pizarra 3: de dónde sale la fórmula de partes y la integral de x · eˣ](img/cal-clase6-pizarra-03-partes-x-ex.jpg)

> Lo que pone la pizarra: d(u·v) = du·v + u·dv → ∫u·dv = ∫d(u·v) − ∫v·du → ∫u dv = uv − ∫v du. ∫x·eˣ dx con u = x, du = dx, dv = eˣ dx, v = eˣ: ∫xeˣ dx = x·eˣ − ∫eˣ dx = xeˣ − eˣ = (x − 1)eˣ. Abajo, la otra elección: u = eˣ, dv = x·dx.

> En el examen: «Resuelve por partes ∫ x·eˣ dx» → (x − 1)·eˣ. Está en el Test no evaluable de la UD4.

### Qué pasa si eliges mal (también lo enseñó)

Probamos al revés:

- u = eˣ → du = eˣ dx
- dv = x dx → v = x² ÷ 2

Aplicamos la fórmula:

- ∫ x · eˣ dx = eˣ · x² ÷ 2 − ∫ (x² ÷ 2) · eˣ dx

La integral nueva tiene x² en vez de x. Es más difícil que la de antes. Hemos empeorado el problema.

![Pizarra 4: la elección mala, que deja x² · eˣ](img/cal-clase6-pizarra-04-partes-elegir-mal.jpg)

> Lo que pone la pizarra: u = eˣ, du = eˣ dx; dv = x·dx, v = ½x². ∫eˣx dx = ½eˣx² − ∫½x²eˣ dx.

> Recuerda: Como u elige lo que se simplifica al derivar: x (se convierte en 1) o ln x (se convierte en 1/x). Como dv, lo que sabes integrar fácil: eˣ, cos x, sen x, x.

### Ejemplo 2 del profe: ∫ ln(x) dx

Parece que solo hay una función. El truco: pensar que es ln(x) · 1.

- u = ln(x) → du = (1/x) dx
- dv = dx → v = x

Aplicamos la fórmula:

- ∫ ln(x) dx = x · ln(x) − ∫ x · (1/x) dx
- x · (1/x) = 1
- = x · ln(x) − ∫ dx
- = x · ln(x) − x + C

> En el examen: «Resuelve por partes ∫ ln(x) dx» → x·ln(x) − x. Está en el Test no evaluable de la UD4.

### Ejemplo 3 del profe: ∫ x · ln(x) dx

El profe lo dejó planteado. Aquí está terminado.

Elegimos (ln x como u, porque no sabemos integrarlo fácil):

- u = ln(x) → du = (1/x) dx
- dv = x dx → v = x² ÷ 2

Aplicamos la fórmula:

- ∫ x · ln(x) dx = (x² ÷ 2) · ln(x) − ∫ (x² ÷ 2) · (1/x) dx

Simplificamos lo de dentro:

- (x² ÷ 2) · (1/x) = x ÷ 2

Integramos:

- ∫ (x ÷ 2) dx = x² ÷ 4

Resultado:

- = (x² ÷ 2) · ln(x) − x² ÷ 4 + C

Si hubiéramos elegido dv = ln(x) dx, primero tendríamos que integrar el logaritmo: más trabajo. Por eso el ln va de u.

![Pizarra 5: las integrales de ln x y de x · ln x](img/cal-clase6-pizarra-05-ln-x-y-x-ln-x.jpg)

> Lo que pone la pizarra: ∫ln(x) dx con u = ln(x), du = (1/x) dx, dv = dx, v = x: = x·ln(x) − ∫x·(1/x) dx = x·ln(x) − ∫dx = x·ln(x) − x. Abajo: ∫x·ln(x) dx con u = ln(x), du = (1/x) dx, dv = x dx, v = ½x².

> En el examen: «Resuelve por partes ∫ x·ln(x) dx» → (x²/2)·ln(x) − x²/4. Está en el Test no evaluable de la UD4. La cuarta de partes del test es ∫ x²·eˣ dx = (x² − 2x + 2)·eˣ: es partes dos veces seguidas (el profe dijo que a veces hay que repetirla).

## Un cambio de variable con trigonometría: ∫ 1 ÷ √(1 − x²) dx

Esta integral está en la tabla: da arcsen(x). El profe enseñó cómo sacarla si no te acuerdas.

La pista: «1 − algo al cuadrado» recuerda a sen² + cos² = 1, que despejado es:

- 1 − sen²(u) = cos²(u)

Cambio:

- x = sen(u)
- dx = cos(u) du

Cambiamos:

- ∫ 1 ÷ √(1 − x²) dx
- = ∫ 1 ÷ √(1 − sen²u) · cos(u) du
- = ∫ 1 ÷ √(cos²u) · cos(u) du
- = ∫ (1 ÷ cos u) · cos(u) du
- = ∫ du
- = u + C

Deshacemos el cambio. Si x = sen(u), entonces u = arcsen(x):

- = arcsen(x) + C

Si se hace el cambio con x = cos(u), sale −arccos(x). Las dos respuestas valen: solo se diferencian en un número fijo (la C).

![Pizarra 6: la integral que da arcoseno, con el cambio x = sen(u)](img/cal-clase6-pizarra-06-arcoseno.jpg)

> Lo que pone la pizarra: ∫ 1/√(1 − x²) dx = ∫ 1/√(1 − sen²u) · cos(u) du = ∫ 1/√(cos²u) · cos(u) du = ∫ du = u = arcsen(x), con x = sen(u), dx = cos(u) du, u = arcsen(x).

> En el examen: En el Test no evaluable de la UD4: ∫ √(4 / (9 − 9x²)) dx = (2/3)·arcsen(x). Es esta misma: sacas el 4/9 fuera de la raíz (2/3) y queda 1/√(1 − x²).

## Integrales definidas y la regla de Barrow

### Indefinida y definida

- Indefinida: sin números en el símbolo. El resultado es una función (+ C).
- Definida: con dos números, de dónde a dónde. El resultado es un número.

### Cómo se calcula (regla de Barrow)

- 1. Sacas la primitiva F(x), sin la C.
- 2. Pones el número de arriba: F(b).
- 3. Pones el número de abajo: F(a).
- 4. Restas: F(b) − F(a).

$ ∫_a^(b) f(x) dx = F(b) − F(a) :: la integral de a a b de f es F de b menos F de a

### El ejemplo del profe: ∫ de 0 a 3 de x² dx

Primitiva:

- F(x) = x³ ÷ 3

Arriba (3):

- F(3) = 3³ ÷ 3
- F(3) = 27 ÷ 3
- F(3) = 9

Abajo (0):

- F(0) = 0³ ÷ 3
- F(0) = 0

Restamos:

- 9 − 0 = 9

> En el examen: Este ejemplo es exacto a una pregunta oficial: «Área bajo g(x) = x² entre x = 0 y x = 3» → 9 (examen 2512770). Y «∫ₐᵇ f(x) dx = F(b) − F(a) representa…» → la regla de Barrow (2512770). En el Test no evaluable de la UD4 hay 6 de Barrow.

## Áreas con integrales

### Área bajo una curva

Si la función está por encima del eje X, la integral definida es el área entre la curva y el eje.

![Mi dibujo: el área bajo x² entre 0 y 3 vale 9](img/cal-clase6-area-x2.svg)

> Qué ves en el dibujo: La curva morada es x². La zona verde, entre la curva y el eje X, desde x = 0 hasta x = 3, es lo que calcula la integral: 9.

Otro ejemplo, como los del examen: área bajo x³ entre 0 y 2.

- F(x) = x⁴ ÷ 4
- F(2) = 2⁴ ÷ 4
- F(2) = 16 ÷ 4
- F(2) = 4
- F(0) = 0
- Área = 4 − 0
- Área = 4

### Cuidado: si la curva está por debajo del eje

Lo avisó el profe: si la función es negativa, la integral sale negativa. Pero un área nunca es negativa.

Qué hay que hacer:

- 1. Buscar dónde la curva corta el eje X.
- 2. Partir la integral en esos puntos.
- 3. Los trozos de debajo del eje se cambian de signo (o se toma el valor absoluto).
- 4. Sumar todo en positivo.

Ejemplo: área entre f(x) = x² − 4x y el eje X.

Cortes con el eje:

- x² − 4x = 0
- x · (x − 4) = 0
- x = 0 y x = 4

Integral entre 0 y 4:

- F(x) = x³ ÷ 3 − 2x²
- F(4) = 64 ÷ 3 − 2 · 16
- F(4) = 64 ÷ 3 − 32
- F(4) = 64 ÷ 3 − 96 ÷ 3
- F(4) = −32 ÷ 3
- F(0) = 0
- Integral = −32 ÷ 3

Sale negativa porque la curva está por debajo. El área es:

- Área = 32 ÷ 3 ≈ 10,67

![Mi dibujo: x² − 4x por debajo del eje entre 0 y 4](img/cal-clase6-area-negativa.svg)

> Qué ves en el dibujo: La parábola morada x² − 4x corta el eje en 0 y en 4 (puntos verdes). Entre medias está por debajo del eje (zona roja). La integral da −32/3, pero el área se da en positivo: 32/3.

> En el examen: «Halla el área de la región limitada por f(x) = x² − 3x y el eje OX» → 27/6 u² (examen 12052). Es este mismo caso: cortes en 0 y 3, la integral sale −27/6 y el área es +27/6. En el Test no evaluable: el área entre f(x) y el eje es ∫ₐᵇ |f(x)| dx, con valor absoluto por esto mismo.

### Área entre dos curvas

Lo dibujó el profe con dos curvas f y g que se cortan en A y en B:

$ Área = ∫_A^(B) (la de arriba − la de abajo) dx :: el área entre dos curvas es la integral de la de arriba menos la de abajo

Así el resultado siempre sale positivo.

Ejemplo: área entre g(x) = x y f(x) = x².

Dónde se cortan:

- x = x²
- x² − x = 0
- x · (x − 1) = 0
- x = 0 y x = 1

Quién está arriba entre 0 y 1 (prueba con x = 0,5):

- g(0,5) = 0,5
- f(0,5) = 0,25
- Arriba está g(x) = x.

Integral:

- ∫ de 0 a 1 de (x − x²) dx
- F(x) = x² ÷ 2 − x³ ÷ 3
- F(1) = 1 ÷ 2 − 1 ÷ 3
- F(1) = 3 ÷ 6 − 2 ÷ 6
- F(1) = 1 ÷ 6
- F(0) = 0
- Área = 1 ÷ 6

![Mi dibujo: el área entre y = x (arriba) y y = x² (abajo) vale 1/6](img/cal-clase6-entre-curvas.svg)

> Qué ves en el dibujo: La recta verde (x) va por encima de la parábola morada (x²) entre los dos puntos rojos donde se cortan, x = 0 y x = 1. La zona azul es el área: 1/6.

### Si las curvas se cruzan por medio

El profe dibujó dos curvas que se cortan en A, B y C. Entre A y B está arriba g, y entre B y C está arriba f. Se parte en dos:

- Área = ∫ de A a B de (g − f) dx + ∫ de B a C de (f − g) dx

Cada trozo, «la de arriba menos la de abajo». Así los dos salen positivos y se suman.

![Pizarra 7: la integral definida de x² entre 0 y 3 y los tres casos de áreas](img/cal-clase6-pizarra-07-definida-y-areas.jpg)

> Lo que pone la pizarra: Integrales indefinidas f(x) → F(x); integrales definidas: ∫₀³ x² dx = ⅓x³ de 0 a 3 = ⅓(3³ − 0³) = 27/3 = 9. Cálculo de áreas: el área verde bajo x² entre 0 y 3; una f(x) que es negativa a un lado y positiva al otro; dos curvas que se cortan en A y B: ∫ₐᴮ (f(x) − g(x)) dx; dos curvas que se cortan en A, B y C: ∫ₐᴮ (g(x) − f(x)) dx + ∫ᴮᶜ (f(x) − g(x)) dx.

### Otras aplicaciones que nombró

Volumen de revolución, superficie de revolución y longitud de una curva. No hizo cuentas: dijo que hay que aprenderse las fórmulas.

- Volumen al girar f(x) alrededor del eje X: π · ∫ₐᵇ (f(x))² dx.
- Superficie de revolución: 2π · ∫ₐᵇ f(x) · √(1 + (f′(x))²) dx.
- Longitud de la curva: ∫ₐᵇ √(1 + (f′(x))²) dx.

> En el examen: «¿Cuál de las siguientes NO es una aplicación del cálculo integral?» → la representación gráfica de funciones. Ha caído 3 veces (2200230, 2410440 y 2512770). Esa es de derivadas. La fórmula de la superficie de revolución ha caído 1 vez (2410440) y un volumen con números 1 vez (12052). Las tres fórmulas están en el Test no evaluable de la UD4.

## Cómo es el examen, según el profe

- Todo tipo test. No hay demostraciones.
- Hay algún concepto teórico, pero sin demostrar nada: saber qué es cada cosa y para qué sirve.
- Suele haber un problema con una función en el que se pregunta todo: un límite, el dominio, el recorrido, una derivada, un máximo y un mínimo. Las funciones no son complicadas, para que se pueda trabajar todo.
- Para la teoría recomienda los tests no evaluables de cada unidad: «la mayoría de las preguntas de los exámenes están ahí». Si se controlan, no debería haber mucho problema.
- La próxima clase empieza la siguiente unidad y hará ejercicios de examen de otros años.
- Dijo que pasará funciones para practicar el estudio entero (límites en distintos puntos, dominio, etc.) y quizá una lista de ejercicios.

> Recuerda: En la web ya tienes el Test no evaluable de la UD4 (29 preguntas) en Exámenes. Y el estudio entero de una función está en las clases 2 a 5 y en la guía de funciones.

## Resumen para el examen

- Integrar es lo contrario de derivar. Siempre + C (la solución no es única).
- Potencia: sumas 1 al exponente y divides. Si el exponente es −1: ln(x).
- Cambio de variable: si ves una función y su derivada. Al final, deshaz el cambio.
- Por partes: ∫ u dv = uv − ∫ v du. Como u, lo que se simplifica al derivar (x, ln x).
- Las 4 de partes del test: x·eˣ → (x − 1)eˣ; ln x → x·ln x − x; x·ln x → (x²/2)·ln x − x²/4; x²·eˣ → (x² − 2x + 2)eˣ.
- Definida: F(arriba) − F(abajo). ∫ de 0 a 3 de x² = 9.
- Área: si la curva baja del eje, ese trozo en positivo. Entre curvas: la de arriba menos la de abajo.
- La representación gráfica NO es una aplicación de la integral.