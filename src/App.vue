<template>
  <v-app>
    <v-overlay
      :model-value="loading"
      persistent
      content-class="text-center"
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="52"
        width="4"
      />
      <div class="mt-3 text-body-2">{{ $t('loading') }}</div>
    </v-overlay>
    <Message />
    <router-view />
  </v-app>
</template>

<script lang="ts" setup>
import Message from '@/components/message.vue'
import { inject, ref, watchEffect, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRtl } from 'vuetify'

const loading = inject<Ref<boolean>>('loading') ?? ref(false)
const { locale: i18nLocale } = useI18n()
const { isRtl } = useRtl()

const toHtmlLang = (code: string): string => {
  if (code === 'zhHans') return 'zh-Hans'
  if (code === 'zhHant') return 'zh-Hant'
  return code
}

watchEffect(() => {
  document.documentElement.dir = isRtl.value ? 'rtl' : 'ltr'
  document.documentElement.lang = toHtmlLang(String(i18nLocale.value))
})

document.title = 'S-UI Nexus ' + document.location.hostname
</script>