/**
 * Información de compra de SweetHome, en un solo lugar (ficha de producto,
 * preguntas frecuentes, bloque de confianza). Fuente: historias destacadas de
 * Instagram "Envío" y "Proceso de compra", y las respuestas habituales por WhatsApp.
 * No incluye costos de envío ni política de cambios: pendientes de decidir.
 */

export interface InfoItem {
  icon: string
  title: string
  detail: string
}

export const PAYMENT_METHODS: readonly InfoItem[] = [
  {
    icon: 'fa-solid fa-hand-holding-dollar',
    title: 'Efectivo al recibir',
    detail: 'Paga cuando le entregamos el producto. Aplica en toda la capital y los departamentos.',
  },
  {
    icon: 'fa-solid fa-building-columns',
    title: 'Transferencia',
    detail: 'Le enviamos la cuenta para transferir y usted nos comparte el comprobante de pago.',
  },
]

export const PURCHASE_STEPS: readonly InfoItem[] = [
  {
    icon: 'fa-brands fa-whatsapp',
    title: 'Envíenos el producto que le interesa',
    detail: 'Con el botón «Comprar» el mensaje ya lleva el producto, su precio y el enlace.',
  },
  { icon: 'fa-solid fa-circle-check', title: 'Confirme su elección', detail: 'Le confirmamos disponibilidad.' },
  {
    icon: 'fa-solid fa-location-dot',
    title: 'Comparta los datos de entrega',
    detail: 'Nombre de quien recibe, dirección exacta y teléfono.',
  },
  {
    icon: 'fa-regular fa-clock',
    title: 'Elija día y horario de entrega',
    detail: 'Coordinamos el envío a la capital o a su departamento.',
  },
]

export const TRUST_POINTS: readonly InfoItem[] = [
  { icon: 'fa-solid fa-gem', title: 'Piezas únicas', detail: 'Muchas son de existencia limitada.' },
  { icon: 'fa-solid fa-truck', title: 'Envíos a toda Guatemala', detail: 'Capital y departamentos.' },
  { icon: 'fa-solid fa-hand-holding-dollar', title: 'Pago al recibir', detail: 'O por transferencia.' },
]

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ: readonly FaqItem[] = [
  {
    question: '¿Cómo compro?',
    answer:
      'Presione «Comprar» en el producto que le interesa y se abrirá WhatsApp con el producto, su precio y el enlace. Le confirmamos disponibilidad, nos comparte nombre de quien recibe, dirección exacta y teléfono, y elegimos juntos el día y horario de entrega.',
  },
  {
    question: '¿Qué formas de pago aceptan?',
    answer:
      'Efectivo al recibir el producto (en toda la capital y los departamentos) o transferencia bancaria: le enviamos la cuenta y usted nos comparte el comprobante.',
  },
  {
    question: '¿Hacen envíos a los departamentos?',
    answer:
      'Sí, enviamos a toda la capital y a los departamentos. El costo y la fecha de entrega se confirman por WhatsApp según su zona.',
  },
  {
    question: '¿Dónde veo precios y medidas?',
    answer: 'Cada producto muestra su precio y sus medidas en la ficha. Si necesita más detalle, escríbanos.',
  },
  {
    question: '¿Las piezas son únicas?',
    answer:
      'Muchas de nuestras piezas son únicas o de existencia limitada. Cuando una se vende la marcamos como vendida; si le interesa algo parecido, escríbanos y le avisamos.',
  },
  {
    question: '¿Tienen tienda física?',
    answer: 'Por el momento vendemos únicamente en línea, con entrega a domicilio en toda Guatemala.',
  },
]
