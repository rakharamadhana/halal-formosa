<template>
  <div class="store-scroll" :class="{ readonly: mode === 'readonly' }">
    <div
        v-for="store in stores"
        :key="store.id"
        class="store-option"
        :class="{
        selected: isSelected(store),
        readonly: mode === 'readonly'
      }"
        @click="onClick(store)"
    >
      <!-- Logo -->
      <div class="store-logo-wrapper">
        <img
            :src="store.logo_url || 'https://via.placeholder.com/60.webp'"
            :alt="store.name"
            class="store-logo"
        />
      </div>
      <!-- Name -->
      <span class="store-name">{{ store.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue"

/* ---------------- Types ---------------- */
interface Store {
  id: string
  name: string
  logo_url?: string | null   // allow null from DB
}

type Mode = "select" | "filter" | "readonly"

/* ---------------- Props ---------------- */
const props = defineProps<{
  stores: Store[]
  mode?: Mode
  modelValue?: string[] | null     // ✅ string IDs
  activeStore?: Store | null
}>()

/* ---------------- Emits ---------------- */
const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'update:activeStore', value: Store | null): void
}>()

/* ---------------- Helpers ---------------- */
function isSelected(store: Store): boolean {
  switch (props.mode) {
    case "select":
      return props.modelValue?.includes(store.id) || false
    case "filter":
      return props.activeStore?.id === store.id
    default:
      return false
  }
}

function onClick(store: Store) {
  if (props.mode === "readonly") return

  if (props.mode === 'select') {
    let newValue = [...(props.modelValue || [])]
    if (newValue.includes(store.id)) {
      newValue = newValue.filter(id => id !== store.id)
    } else {
      newValue.push(store.id)
    }
    emit('update:modelValue', newValue)
  }


  if (props.mode === "filter") {
    emit("update:activeStore", props.activeStore?.id === store.id ? null : store)
  }
}
</script>
