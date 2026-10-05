<template>
  <transition name="cookie-fade">
    <div v-if="visible" class="cookie-notice" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies de analítica para mejorar el catálogo.
        <router-link to="/privacidad">Más información</router-link>
      </p>
      <button type="button" class="cookie-ok" @click="dismiss">Entendido</button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'sh_cookie_notice_dismissed'
const visible = ref(false)

// Solo en cliente: en SSR nunca se renderiza (evita parpadeo para quien ya lo cerró).
onMounted(() => {
  try {
    visible.value = localStorage.getItem(STORAGE_KEY) !== '1'
  } catch {
    visible.value = true
  }
})

function dismiss() {
  visible.value = false
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // almacenamiento bloqueado: se vuelve a mostrar en la próxima visita
  }
}
</script>

<style lang="scss" scoped>
.cookie-notice {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 3000;
  max-width: 340px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--ks-surface, #fff);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);

  p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--ks-text-secondary, #555);
  }

  a {
    color: var(--ks-text, #000);
    font-weight: 600;
  }
}

.cookie-ok {
  flex-shrink: 0;
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  background: var(--ks-primary, #000);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.cookie-fade-enter-active,
.cookie-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.cookie-fade-enter-from,
.cookie-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 599px) {
  .cookie-notice {
    left: 12px;
    right: 84px;
    max-width: none;
    /* Encima de la barra de navegación inferior. */
    bottom: calc(76px + env(safe-area-inset-bottom));
  }
}
</style>
