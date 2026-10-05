<template>
  <q-page class="privacy-page">
    <article class="privacy-content">
      <p class="privacy-eyebrow">Legal</p>
      <h1>Política de privacidad y cookies</h1>
      <p class="privacy-updated">Última actualización: 4 de octubre de 2026</p>

      <p>
        En <strong>{{ storeName }}</strong> respetamos su privacidad. Esta página explica qué
        información se recopila cuando visita nuestro catálogo en línea y para qué se usa.
      </p>

      <h2>Qué información recopilamos</h2>
      <p>
        Para ver el catálogo no necesita crear una cuenta ni ingresar datos personales. Solo se
        recopila información de uso de forma anónima:
      </p>
      <ul>
        <li>Páginas y productos que visita.</li>
        <li>
          Acciones dentro del catálogo: categorías que elige, búsquedas que realiza y clics en
          el botón de compra por WhatsApp.
        </li>
        <li>Datos técnicos generales: tipo de dispositivo, navegador y ubicación aproximada (ciudad o país).</li>
      </ul>
      <p>No recopilamos su nombre, teléfono, correo ni datos de pago a través de este sitio.</p>

      <h2>Para qué la usamos</h2>
      <ul>
        <li>Saber qué productos y categorías interesan más.</li>
        <li>Detectar productos que se buscan y aún no ofrecemos.</li>
        <li>Mejorar el funcionamiento y el diseño del catálogo.</li>
      </ul>
      <p>No vendemos ni compartimos esta información con terceros para fines publicitarios.</p>

      <h2>Cookies</h2>
      <p>
        Usamos <strong>Google Analytics</strong> (a través de Firebase), que guarda cookies en su
        navegador para distinguir visitas de forma anónima:
      </p>
      <ul>
        <li><code>_ga</code> y <code>_ga_*</code>: medición de visitas. Duración hasta 2 años.</li>
      </ul>
      <p>
        También guardamos en su navegador si ya cerró el aviso de cookies, para no volver a
        mostrarlo. Puede borrar o bloquear las cookies desde la configuración de su navegador;
        el catálogo seguirá funcionando con normalidad.
      </p>

      <h2>Compras por WhatsApp</h2>
      <p>
        Al presionar «Comprar» se abre WhatsApp con un mensaje sobre el producto. La conversación
        y los datos que comparta en ella (nombre, dirección, forma de pago) se usan únicamente
        para atender y entregar su pedido. WhatsApp se rige por su propia política de privacidad.
      </p>

      <h2>Contacto</h2>
      <p>
        Si tiene preguntas sobre esta política o desea que eliminemos información relacionada con
        sus pedidos, escríbanos por WhatsApp al
        <a :href="whatsappLink" target="_blank" rel="noopener noreferrer">{{ whatsappDisplay }}</a>.
      </p>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStoreConfigStore } from '@/stores'
import { usePageSeo } from '@/composables/usePageSeo'

const storeConfig = useStoreConfigStore()
const storeName = computed(() => storeConfig.config?.name ?? 'SweetHome GT')

const whatsappDigits = computed(() => storeConfig.whatsappNumber.replace(/\D/g, ''))
const whatsappLink = computed(() => `https://wa.me/${whatsappDigits.value}`)
const whatsappDisplay = computed(() => {
  const d = whatsappDigits.value
  return d.length === 11 ? `+${d.slice(0, 3)} ${d.slice(3, 7)}-${d.slice(7)}` : `+${d}`
})

usePageSeo({
  title: computed(() => `Privacidad | ${storeConfig.seoTitleSuffix}`),
  description: 'Qué información recopila el catálogo de SweetHome GT, para qué se usa y qué cookies utiliza.',
  path: '/privacidad',
})
</script>

<style lang="scss" scoped>
.privacy-page {
  background: var(--ks-bg, #f5f5f5);
  padding: 40px 20px 60px;
}

.privacy-content {
  max-width: 720px;
  margin: 0 auto;
  background: var(--ks-surface, #fff);
  border-radius: var(--ks-radius, 16px);
  padding: 40px;
  line-height: 1.7;
  color: var(--ks-text, #000);

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 6px;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 28px 0 8px;
  }

  p,
  li {
    font-size: 0.95rem;
    color: var(--ks-text-secondary, #555);
  }

  ul {
    padding-left: 20px;
    margin: 8px 0;
  }

  a {
    color: var(--ks-primary, #000);
    font-weight: 600;
  }

  code {
    font-size: 0.85em;
    background: var(--ks-bg, #f5f5f5);
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.privacy-eyebrow {
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--ks-secondary, #d19793) !important;
  font-weight: 600;
  margin: 0 0 8px;
}

.privacy-updated {
  font-size: 0.8rem !important;
  margin: 0 0 20px;
}

@media (max-width: 599px) {
  .privacy-page {
    padding: 16px;
  }

  .privacy-content {
    padding: 24px 20px;
  }
}
</style>
