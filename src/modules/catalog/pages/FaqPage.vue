<template>
  <q-page class="faq-page">
    <div class="faq-content">
      <p class="faq-eyebrow">Ayuda</p>
      <h1>Preguntas frecuentes</h1>
      <p class="faq-intro">Todo lo que necesita saber para comprar en {{ storeName }}.</p>

      <section class="faq-block">
        <h2>Cómo comprar</h2>
        <ol class="faq-steps">
          <li v-for="(step, i) in PURCHASE_STEPS" :key="step.title">
            <span class="faq-step-num">{{ i + 1 }}</span>
            <div>
              <strong>{{ step.title }}</strong>
              <p>{{ step.detail }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="faq-block">
        <h2>Formas de pago</h2>
        <div class="faq-pay">
          <div v-for="m in PAYMENT_METHODS" :key="m.title" class="faq-pay-item">
            <q-icon :name="m.icon" size="20px" />
            <div>
              <strong>{{ m.title }}</strong>
              <p>{{ m.detail }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="faq-block">
        <div class="faq-block-head">
          <h2>Otras preguntas</h2>
          <q-input
            v-model="search"
            outlined
            dense
            rounded
            clearable
            placeholder="Buscar una pregunta…"
            aria-label="Buscar en preguntas frecuentes"
            class="faq-search"
            hide-bottom-space
            @clear="search = ''"
          >
            <template #prepend><q-icon name="fa-solid fa-magnifying-glass" size="xs" /></template>
          </q-input>
        </div>

        <div class="faq-list">
          <q-expansion-item
            v-for="item in filteredFaq"
            :key="item.question"
            class="faq-item"
            expand-icon="fa-solid fa-plus"
            expanded-icon="fa-solid fa-minus"
            header-class="faq-item-header"
          >
            <template #header>
              <q-item-section>
                <span class="faq-question">{{ item.question }}</span>
              </q-item-section>
            </template>
            <div class="faq-answer">{{ item.answer }}</div>
          </q-expansion-item>
          <p v-if="!filteredFaq.length" class="faq-empty">Ninguna pregunta coincide con su búsqueda.</p>
        </div>
      </section>

      <div class="faq-cta">
        <p>¿No encontró su respuesta?</p>
        <q-btn
          unelevated
          no-caps
          color="dark"
          icon="fa-brands fa-whatsapp"
          label="Escríbanos por WhatsApp"
          class="faq-cta-btn"
          @click="openWhatsAppGeneral('faq_page', 'Hola, tengo una consulta sobre su tienda.')"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeForSearch } from '@/utils/slugify'
import { useMeta } from 'quasar'
import { useStoreConfigStore } from '@/stores'
import { usePageSeo } from '@/composables/usePageSeo'
import { useWhatsApp } from '@/composables/useWhatsApp'
import { FAQ, PAYMENT_METHODS, PURCHASE_STEPS } from '@/content/purchaseInfo'

const storeConfig = useStoreConfigStore()
const { openWhatsAppGeneral } = useWhatsApp()
const storeName = computed(() => storeConfig.config?.name ?? 'SweetHome GT')

const search = ref('')
const filteredFaq = computed(() => {
  const q = normalizeForSearch(search.value ?? '')
  return q ? FAQ.filter((f) => normalizeForSearch(`${f.question} ${f.answer}`).includes(q)) : FAQ
})

usePageSeo({
  title: computed(() => `Preguntas frecuentes | ${storeConfig.seoTitleSuffix}`),
  description: 'Cómo comprar en SweetHome GT: proceso por WhatsApp, formas de pago y envíos a toda Guatemala.',
  path: '/preguntas-frecuentes',
})

// Datos estructurados FAQPage: Google puede mostrar estas preguntas en los resultados.
useMeta({
  script: {
    ldJsonFaq: {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }),
    },
  },
})
</script>

<style lang="scss" scoped>
.faq-page {
  background: var(--ks-bg, #f5f5f5);
  padding: 40px 20px 60px;
}

.faq-content {
  max-width: 860px;
  margin: 0 auto;
  background: var(--ks-surface, #fff);
  border-radius: var(--ks-radius, 16px);
  padding: 40px;
  color: var(--ks-text, #000);

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 6px;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 12px;
  }

  p {
    margin: 0;
    color: var(--ks-text-secondary, #555);
    line-height: 1.6;
    font-size: 0.95rem;
  }
}

.faq-eyebrow {
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--ks-secondary, #d19793) !important;
  font-weight: 600;
  margin-bottom: 8px !important;
}

.faq-intro {
  margin-bottom: 28px !important;
}

.faq-block {
  margin-top: 28px;
}

.faq-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  strong {
    display: block;
    margin-bottom: 2px;
  }
}

.faq-step-num {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ks-secondary, #d19793);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
}

.faq-pay {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.faq-pay-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ks-accent, #e9e3ca) 30%, #fff);

  .q-icon {
    color: var(--ks-secondary, #d19793);
  }

  strong {
    display: block;
    margin-bottom: 2px;
  }
}

.faq-block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0 !important;
  }
}

.faq-search {
  width: 260px;

  :deep(.q-field__control) {
    min-height: 40px;
  }
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: var(--ks-surface, #fff);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;

  &:hover {
    border-color: rgba(0, 0, 0, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }

  :deep(.faq-item-header) {
    padding: 18px 22px;
    min-height: auto;
  }

  :deep(.q-expansion-item__toggle-icon) {
    color: var(--ks-secondary, #d19793);
    font-size: 16px;
  }

  // El gris de foco/hover de Quasar es muy fuerte para esta tarjeta.
  :deep(.q-focus-helper) {
    display: none;
  }

  &.q-expansion-item--expanded :deep(.faq-item-header) {
    background: color-mix(in srgb, var(--ks-secondary, #d19793) 8%, #fff);
  }
}

.faq-question {
  font-weight: 600;
  font-size: 0.98rem;
  line-height: 1.5;
}

.faq-answer {
  padding: 16px 22px 20px;
  background: color-mix(in srgb, var(--ks-accent, #e9e3ca) 22%, #fff);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  color: var(--ks-text-secondary, #555);
  font-size: 0.93rem;
  line-height: 1.7;
}

.faq-empty {
  text-align: center;
  padding: 16px 0;
}

.faq-cta {
  margin-top: 32px;
  padding: 20px;
  border-radius: 14px;
  background: var(--ks-bg, #f5f5f5);
  text-align: center;

  p {
    margin-bottom: 12px;
    font-weight: 600;
    color: var(--ks-text, #000);
  }
}

.faq-cta-btn {
  border-radius: 999px;
  padding: 4px 22px;
}

@media (max-width: 599px) {
  .faq-page {
    padding: 16px;
  }

  .faq-content {
    padding: 24px 20px;
  }

  .faq-pay {
    grid-template-columns: 1fr;
  }

  .faq-search {
    width: 100%;
  }

  .faq-item :deep(.faq-item-header) {
    padding: 14px 16px;
  }

  .faq-answer {
    padding: 14px 16px 16px;
  }
}
</style>
