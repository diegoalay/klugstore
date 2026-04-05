<template>
  <q-page class="about-page">
    <div class="about-hero">
      <div class="about-hero-inner">
        <p class="about-eyebrow">Nuestra historia</p>
        <h1 class="about-title">Ambientes cálidos,<br />momentos memorables.</h1>
        <p class="about-intro">
          En <strong>SweetHome GT</strong> no solo vendemos objetos para decorar. Curamos piezas
          que ayudan a transformar un espacio en un hogar con alma.
        </p>
      </div>
    </div>

    <section class="about-section">
      <div class="about-grid">
        <div class="about-card">
          <q-icon name="fa-solid fa-heart" size="28px" :style="{ color: accent }" />
          <h2>Lo que creemos</h2>
          <p>
            Cada rincón cuenta una historia. Un florero, una vela, una bandeja de madera — cuando
            están bien elegidos, los detalles pequeños cambian por completo la forma en que se
            siente una casa.
          </p>
        </div>

        <div class="about-card">
          <q-icon name="fa-solid fa-leaf" size="28px" :style="{ color: accent }" />
          <h2>Lo que ofrecemos</h2>
          <p>
            Jarrones escultóricos, trays y bandejas, tablas de queso, candeleros y piezas de
            temporada — especialmente Navidad, cuando la decoración cobra un valor emocional más
            fuerte. Estética y funcionalidad, sin medias tintas.
          </p>
        </div>

        <div class="about-card">
          <q-icon name="fa-solid fa-hand-holding-heart" size="28px" :style="{ color: accent }" />
          <h2>Cómo compramos juntos</h2>
          <p>
            Te acompañamos por WhatsApp. Ves la pieza en el catálogo, nos escribes, coordinamos
            entrega y pago. Sencillo, cercano, sin carritos complicados — como debe ser comprar algo
            para tu casa.
          </p>
        </div>
      </div>
    </section>

    <section class="about-cta-strip" aria-labelledby="about-cta-heading">
      <div class="about-cta-inner">
        <h2 id="about-cta-heading" class="about-cta-title">¿Listo para transformar tu espacio?</h2>
        <p class="about-cta-lead">
          Explora el catálogo completo o escríbenos directo por WhatsApp.
        </p>
        <div class="about-cta-actions">
          <q-btn
            class="cta-btn cta-primary"
            no-caps
            unelevated
            label="Ver catálogo"
            icon-right="fa-solid fa-arrow-right"
            @click="goCatalog"
          />
          <q-btn
            class="cta-btn cta-wa"
            no-caps
            unelevated
            icon="fa-brands fa-whatsapp"
            label="Escríbenos"
            @click="openWhatsAppGeneral()"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreConfigStore } from 'src/stores'
import { useWhatsApp } from 'src/composables/useWhatsApp'

const router = useRouter()
const storeConfig = useStoreConfigStore()
const { openWhatsAppGeneral } = useWhatsApp()

const accent = computed(() => storeConfig.theme?.secondaryColor ?? '#d19793')

function goCatalog() {
  void router.push({ name: 'catalog-home' })
}
</script>

<style lang="scss" scoped>
.about-page {
  background: var(--ks-bg, #f5f5f5);
  padding-bottom: 60px;
}

.about-hero {
  background: var(--ks-surface, #ffffff);
  padding: 60px 20px 80px;
  border-bottom: 1px solid var(--ks-bg, #f0f0f0);
}

.about-hero-inner {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.about-eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--ks-secondary, #d19793);
  font-weight: 600;
  margin: 0 0 16px;
}

.about-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--ks-text, #000);
  margin: 0 0 24px;
}

.about-intro {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--ks-text-secondary, #6b6b6b);
  margin: 0;

  strong {
    color: var(--ks-text, #000);
    font-weight: 700;
  }
}

.about-section {
  max-width: 960px;
  margin: 0 auto;
  padding: 60px 20px;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.about-card {
  background: var(--ks-surface, #ffffff);
  padding: 32px 24px;
  border-radius: var(--ks-radius, 16px);
  border: 1px solid var(--ks-bg, #f0f0f0);
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  }

  h2 {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--ks-text, #000);
    margin: 16px 0 10px;
  }

  p {
    font-size: 0.92rem;
    line-height: 1.6;
    color: var(--ks-text-secondary, #6b6b6b);
    margin: 0;
  }
}

/* Franja a ancho completo — fondo rosa de marca (--ks-secondary) */
.about-cta-strip {
  margin-top: 24px;
  padding: 52px 20px 56px;
  background: var(--ks-secondary, #d19793);
}

.about-cta-inner {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.about-cta-title {
  font-size: clamp(1.35rem, 4vw, 1.85rem);
  font-weight: 800;
  line-height: 1.25;
  color: #ffffff;
  margin: 0 0 14px;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.about-cta-lead {
  font-size: 1.02rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 28px;
}

.about-cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-btn {
  border-radius: 12px !important;
  font-weight: 600;
  font-size: 0.9rem;
  min-height: 48px !important;
  padding: 12px 24px !important;
}

.cta-primary {
  background: var(--ks-primary, #000) !important;
  color: #fff !important;
}

.cta-wa {
  background: #25d366 !important;
  color: #fff !important;
}

@media (max-width: 768px) {
  .about-hero {
    padding: 40px 20px 60px;
  }

  .about-title {
    font-size: 1.8rem;
  }

  .about-intro {
    font-size: 1rem;
  }

  .about-section {
    padding: 40px 20px;
  }

  .about-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .about-card {
    padding: 24px 20px;
  }

  .about-cta-strip {
    padding: 40px 16px 44px;
  }

  .about-cta-title {
    font-size: 1.35rem;
  }
}
</style>
