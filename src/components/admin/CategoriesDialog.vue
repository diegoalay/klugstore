<template>
  <q-dialog v-model="open" :maximized="$q.screen.lt.sm" transition-show="scale" transition-hide="scale">
    <q-card class="cat-card">
      <div class="cat-header">
        <div>
          <div class="cat-eyebrow">Catálogo</div>
          <div class="cat-title">Categorías</div>
        </div>
        <q-btn round flat icon="fa-solid fa-xmark" color="grey-7" class="admin-btn-sm" @click="open = false" />
      </div>

      <div class="cat-body">
        <div v-for="(c, idx) in rows" :key="c.slug" class="cat-row">
          <div class="cat-order">
            <q-btn
              flat
              round
              icon="fa-solid fa-chevron-up"
              color="grey-6"
              class="admin-btn-sm"
              :disable="idx === 0"
              @click="move(idx, -1)"
            />
            <q-btn
              flat
              round
              icon="fa-solid fa-chevron-down"
              color="grey-6"
              class="admin-btn-sm"
              :disable="idx === rows.length - 1"
              @click="move(idx, 1)"
            />
          </div>

          <q-select
            v-model="c.icon"
            :options="CATEGORY_ICON_OPTIONS"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            options-dense
            class="cat-icon-select"
            popup-content-class="cat-icon-popup"
          >
            <template #selected>
              <q-icon :name="categoryIconClass(c.icon)" size="16px" />
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar class="cat-icon-avatar">
                  <q-icon :name="categoryIconClass(scope.opt.value)" size="16px" />
                </q-item-section>
                <q-item-section>{{ scope.opt.label }}</q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-input v-model="c.name" outlined dense class="cat-name" placeholder="Nombre" />

          <span class="cat-count">{{ productCount(c.slug) }}</span>

          <q-btn
            flat
            round
            icon="fa-solid fa-trash-can"
            color="negative"
            class="admin-btn-sm"
            :disable="productCount(c.slug) > 0"
            @click="remove(c.slug)"
          >
            <q-tooltip v-if="productCount(c.slug) > 0">Tiene productos — muévelos antes de borrarla</q-tooltip>
          </q-btn>
        </div>

        <div class="cat-row cat-row--new">
          <div class="cat-order" />
          <q-select
            v-model="newIcon"
            :options="CATEGORY_ICON_OPTIONS"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            options-dense
            class="cat-icon-select"
          >
            <template #selected>
              <q-icon :name="categoryIconClass(newIcon)" size="16px" />
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar class="cat-icon-avatar">
                  <q-icon :name="categoryIconClass(scope.opt.value)" size="16px" />
                </q-item-section>
                <q-item-section>{{ scope.opt.label }}</q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-input
            v-model="newName"
            outlined
            dense
            class="cat-name"
            placeholder="Nueva categoría"
            @keyup.enter="add"
          />
          <q-btn
            outline
            no-caps
            color="dark"
            icon="fa-solid fa-plus"
            label="Agregar"
            class="admin-btn"
            :disable="!newName.trim()"
            @click="add"
          />
        </div>
      </div>

      <div class="cat-footer">
        <q-btn
          unelevated
          no-caps
          color="dark"
          icon="fa-solid fa-floppy-disk"
          label="Guardar cambios"
          class="admin-btn cat-save"
          :loading="saving"
          @click="save"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar, Notify } from 'quasar'
import { slugifyCatalogText } from '@/utils/slugify'
import { CATEGORY_ICON_OPTIONS, categoryIconClass } from '@/utils/categoryIcons'
import { useAdminFirestoreCatalogStore, type AdminCategory } from '@/stores/admin-firestore-catalog-store'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const $q = useQuasar()
const store = useAdminFirestoreCatalogStore()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const rows = ref<AdminCategory[]>([])
const newName = ref('')
const newIcon = ref('tag')
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  rows.value = [...store.categories].sort((a, b) => a.order - b.order).map((c) => ({ ...c }))
  newName.value = ''
  newIcon.value = 'tag'
})

const countBySlug = computed(() => {
  const counts = new Map<string, number>()
  for (const p of store.products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1)
  return counts
})

function productCount(slug: string): number {
  return countBySlug.value.get(slug) ?? 0
}

function move(idx: number, delta: number) {
  const next = [...rows.value]
  const [item] = next.splice(idx, 1)
  if (!item) return
  next.splice(idx + delta, 0, item)
  rows.value = next
}

function add() {
  const name = newName.value.trim()
  const slug = slugifyCatalogText(name)
  if (!slug) return
  if (rows.value.some((c) => c.slug === slug)) {
    Notify.create({ type: 'warning', message: 'Ya existe una categoría con ese nombre' })
    return
  }
  rows.value.push({ slug, name, icon: newIcon.value, order: rows.value.length + 1 })
  newName.value = ''
  newIcon.value = 'tag'
}

function remove(slug: string) {
  rows.value = rows.value.filter((c) => c.slug !== slug)
}

async function save() {
  if (rows.value.some((c) => !c.name.trim())) {
    Notify.create({ type: 'warning', message: 'Todas las categorías necesitan nombre' })
    return
  }
  saving.value = true
  try {
    const keep = new Set(rows.value.map((c) => c.slug))
    for (const c of store.categories.filter((c) => !keep.has(c.slug))) await store.deleteCategory(c.slug)
    for (const [i, c] of rows.value.entries()) {
      await store.saveCategory({ ...c, name: c.name.trim(), order: i + 1 })
    }
    Notify.create({ type: 'positive', message: 'Categorías guardadas' })
    open.value = false
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'No se pudieron guardar las categorías' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.cat-card {
  width: 100%;
  max-width: 620px;
  border-radius: 20px;
  overflow: hidden;
}

.cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.cat-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d19793;
}

.cat-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 2px;
}

.cat-body {
  background: #faf8f5;
  padding: 16px 24px;
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 6px 10px 6px 4px;

  &--new {
    margin-top: 8px;
    border-style: dashed;
  }
}

.cat-order {
  display: flex;
  flex-direction: column;
  width: 32px;
  flex-shrink: 0;

  :deep(.q-btn) {
    min-height: 22px !important;
    height: 22px;
  }
}

.cat-icon-select {
  width: 64px;
  flex-shrink: 0;
}

.cat-name {
  flex: 1;
  min-width: 0;
}

.cat-icon-select,
.cat-name {
  :deep(.q-field__control) {
    border-radius: 10px;
    min-height: 40px;
  }
}

.cat-count {
  font-size: 0.75rem;
  color: #9a9a9a;
  min-width: 24px;
  text-align: right;
}

.cat-icon-avatar {
  min-width: 32px;
}

.cat-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.cat-save {
  padding: 0 20px;
}
</style>
