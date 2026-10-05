<template>
  <div class="image-manager">
    <div v-if="images.length" class="image-grid">
      <div v-for="(img, idx) in images" :key="img.url" class="image-tile" :class="{ 'is-cover': idx === 0 }">
        <img :src="img.url" :alt="img.alt || ''" class="image-thumb" loading="lazy" />
        <q-badge v-if="idx === 0" color="dark" class="cover-badge">Portada</q-badge>
        <div class="image-tile-actions">
          <q-btn
            v-if="idx !== 0"
            round
            dense
            flat
            color="white"
            icon="fa-solid fa-star"
            :disable="busy"
            @click="makeCover(idx)"
          >
            <q-tooltip>Hacer portada</q-tooltip>
          </q-btn>
          <q-btn
            round
            dense
            flat
            color="white"
            icon="fa-solid fa-trash-can"
            :disable="busy"
            @click="removeAt(idx)"
          >
            <q-tooltip>Eliminar</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
    <p v-else class="text-caption text-grey-7 q-mb-sm">Sin imágenes todavía.</p>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden-file-input"
      @change="onFilesPicked"
    />
    <q-btn
      outline
      no-caps
      color="dark"
      icon="fa-solid fa-upload"
      label="Subir fotos"
      :loading="busy"
      class="admin-btn upload-btn"
      @click="fileInputRef?.click()"
    />
    <p class="text-caption text-grey-7 q-mt-xs q-mb-none">
      La primera foto es la portada que se ve en el catálogo.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Notify } from 'quasar'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/boot/firebase'
import type { ProductImage } from '@/types'

const props = defineProps<{
  images: ProductImage[]
  storeSlug: string
  productId: string
  productName: string
}>()

const emit = defineEmits<{
  'update:images': [ProductImage[]]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const busy = ref(false)

function reorder(list: ProductImage[]): ProductImage[] {
  return list.map((img, i) => ({ ...img, order: i }))
}

function makeCover(idx: number) {
  const next = [...props.images]
  const [item] = next.splice(idx, 1)
  if (!item) return
  next.unshift(item)
  emit('update:images', reorder(next))
}

async function removeAt(idx: number) {
  const target = props.images[idx]
  if (!target) return
  const next = props.images.filter((_, i) => i !== idx)
  emit('update:images', reorder(next))
  // Best-effort: si la imagen vive en nuestro bucket, borrarla también ahí.
  // Si falla (ya borrada, URL externa, permisos) no bloquea la UI.
  if (target.url.includes('firebasestorage')) {
    try {
      await deleteObject(storageRef(storage, decodeStoragePath(target.url)))
    } catch {
      // no-op
    }
  }
}

function decodeStoragePath(url: string): string {
  // Extrae el path codificado entre /o/ y ?alt= de una URL de descarga de
  // Firebase Storage.
  const match = /\/o\/([^?]+)/.exec(url)
  return match?.[1] ? decodeURIComponent(match[1]) : url
}

async function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // permite volver a elegir el mismo archivo después
  if (files.length === 0) return

  busy.value = true
  try {
    const uploaded: ProductImage[] = []
    for (const file of files) {
      const path = `stores/${props.storeSlug}/products/${props.productId}/${Date.now()}-${file.name}`
      const ref = storageRef(storage, path)
      await uploadBytes(ref, file)
      const url = await getDownloadURL(ref)
      uploaded.push({ url, alt: props.productName, order: 0 })
    }
    emit('update:images', reorder([...props.images, ...uploaded]))
    Notify.create({ type: 'positive', message: `${uploaded.length} imagen(es) subida(s)` })
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'No se pudo subir una o más imágenes' })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.image-tile {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;

  &.is-cover {
    border-color: #000;
  }
}

.image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
}

.image-tile-actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.image-tile:hover .image-tile-actions,
.image-tile:focus-within .image-tile-actions {
  opacity: 1;
}

.hidden-file-input {
  display: none;
}

.upload-btn {
  width: 100%;
}
</style>
