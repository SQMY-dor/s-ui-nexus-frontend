<template>
  <v-main class="sui-login-main">
    <div class="sui-login-shell">
      <header class="sui-login-topbar d-flex align-center justify-end ga-1 pa-3 pa-sm-4">
        <v-menu location="bottom end">
          <template #activator="{ props: activatorProps }">
            <v-btn
              icon
              variant="text"
              size="small"
              v-bind="activatorProps"
              :aria-label="currentLangTitle"
              :title="currentLangTitle"
            >
              <v-icon icon="mdi-translate" size="20" />
            </v-btn>
          </template>
          <v-list density="compact" nav min-width="160">
            <v-list-item
              v-for="lang in languages"
              :key="lang.value"
              :active="isActiveLocale(lang.value)"
              color="primary"
              rounded="md"
              @click="changeLocale(lang.value)"
            >
              <v-list-item-title>{{ lang.title }}</v-list-item-title>
              <template v-if="isActiveLocale(lang.value)" #append>
                <v-icon icon="mdi-check" size="16" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-menu location="bottom end">
          <template #activator="{ props: activatorProps }">
            <v-btn
              icon
              variant="text"
              size="small"
              v-bind="activatorProps"
              :aria-label="$t(`theme.${selectedTheme}`)"
              :title="$t(`theme.${selectedTheme}`)"
            >
              <v-icon :icon="currentThemeIcon" size="20" />
            </v-btn>
          </template>
          <v-list density="compact" nav min-width="160">
            <v-list-item
              v-for="th in themes"
              :key="th.value"
              :prepend-icon="th.icon"
              :active="selectedTheme === th.value"
              color="primary"
              rounded="md"
              @click="changeTheme(th.value)"
            >
              <v-list-item-title>{{ $t(`theme.${th.value}`) }}</v-list-item-title>
              <template v-if="selectedTheme === th.value" #append>
                <v-icon icon="mdi-check" size="16" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </header>

      <div class="sui-login-stage">
        <v-card class="sui-login-card" elevation="0" border rounded="lg">
          <div class="d-flex flex-column align-center text-center mb-6">
            <BrandLogo :size="44" />
            <h1 class="sui-login-title mt-3">S-UI Nexus</h1>
            <p class="sui-login-subtitle text-medium-emphasis mt-1 mb-0">
              {{ $t('ui.brandSubtitle') }}
            </p>
          </div>

          <v-form ref="form" @submit.prevent="login">
            <v-text-field
              v-model="username"
              :label="$t('login.username')"
              :rules="usernameRules"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-outline"
              autocomplete="username"
              class="mb-2"
              autofocus
              required
            />

            <v-text-field
              v-model="password"
              :label="$t('login.password')"
              :rules="passwordRules"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-outline"
              autocomplete="current-password"
              class="mb-2"
              required
            >
              <template #append-inner>
                <v-btn
                  type="button"
                  :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  size="x-small"
                  density="comfortable"
                  :aria-label="showPassword ? $t('ui.hidePassword') : $t('ui.showPassword')"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                />
              </template>
            </v-text-field>

            <v-text-field
              v-if="requires2FA"
              v-model="otp"
              :label="$t('auth.twoFactorCode')"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield-key-outline"
              autocomplete="one-time-code"
              class="mb-2 sui-mono"
              autofocus
              required
            />

            <v-btn
              :loading="loading"
              type="submit"
              color="primary"
              variant="flat"
              size="large"
              block
              class="mt-2"
            >
              {{ $t('login.title') }}
            </v-btn>
          </v-form>

          <template v-if="authMethods.passkey || authMethods.oidc">
            <v-divider class="my-5" />
            <div class="d-flex flex-column ga-2">
              <v-btn
                v-if="authMethods.passkey"
                :disabled="!username.trim()"
                :loading="loading"
                block
                variant="tonal"
                color="primary"
                size="large"
                prepend-icon="mdi-key-variant"
                @click="passkeyLogin"
              >
                {{ $t('auth.passkey') }}
              </v-btn>
              <v-btn
                v-if="authMethods.oidc"
                :loading="loading"
                block
                variant="outlined"
                size="large"
                prepend-icon="mdi-login-variant"
                @click="oidcLogin"
              >
                {{ $t('auth.oidcSso') }}
              </v-btn>
            </div>
          </template>
        </v-card>
      </div>
    </div>
  </v-main>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLocale, useTheme } from 'vuetify'
import { push } from 'notivue'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import { i18n, languages } from '@/locales'
import HttpUtil from '@/plugins/httputil'
import { loginWithPasskey } from '@/plugins/webauthn'

const theme = useTheme()
const vuetifyLocale = useLocale()
const { locale: i18nLocale } = useI18n()
const router = useRouter()

const themes = [
  { value: 'light', icon: 'mdi-white-balance-sunny' },
  { value: 'dark', icon: 'mdi-moon-waning-crescent' },
  { value: 'system', icon: 'mdi-laptop' },
] as const

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const otp = ref('')
const requires2FA = ref(false)
const authMethods = ref({ oidc: false, passkey: false, totp: true })

const usernameRules = [
  (value: string) => {
    if (value?.length > 0) return true
    return i18n.global.t('login.unRules')
  },
]

const passwordRules = [
  (value: string) => {
    if (value?.length > 0) return true
    return i18n.global.t('login.pwRules')
  },
]

const currentLangTitle = computed(() => {
  const match = languages.find((lang) => lang.value === i18nLocale.value)
  return match?.title ?? 'Language'
})

const isActiveLocale = (l: string) => i18nLocale.value === l

const selectedTheme = computed<'light' | 'dark' | 'system'>(() => {
  if (theme.isSystem.value) return 'system'
  return theme.name.value === 'dark' ? 'dark' : 'light'
})

const currentThemeIcon = computed(() => {
  if (selectedTheme.value === 'light') return 'mdi-white-balance-sunny'
  if (selectedTheme.value === 'dark') return 'mdi-moon-waning-crescent'
  return 'mdi-theme-light-dark'
})

onMounted(async () => {
  const response = await HttpUtil.get('api/auth-meta')
  if (response.success && response.obj) {
    authMethods.value = { ...authMethods.value, ...response.obj }
  }
})

const login = async () => {
  const result = await form.value?.validate()
  if (result && !result.valid) return
  if (username.value === '' || password.value === '') return

  loading.value = true
  try {
    const response = await HttpUtil.post('api/login', {
      user: username.value,
      pass: password.value,
      otp: otp.value,
    })
    if (!response.success) return
    if (response.obj?.requires2FA) {
      requires2FA.value = true
      return
    }
    requires2FA.value = false
    otp.value = ''
    await router.replace('/')
  } finally {
    loading.value = false
  }
}

const oidcLogin = async () => {
  loading.value = true
  try {
    const response = await HttpUtil.get('api/oidc-start')
    if (response.success && response.obj?.url) {
      window.location.assign(response.obj.url)
    }
  } finally {
    loading.value = false
  }
}

const passkeyLogin = async () => {
  const trimmedUser = username.value.trim()
  if (!trimmedUser) return

  loading.value = true
  try {
    await loginWithPasskey(trimmedUser)
    await router.replace('/')
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string } | null
    const message =
      err?.name === 'NotAllowedError'
        ? i18n.global.t('security.loginCancelled')
        : err?.message || i18n.global.t('security.webauthnFailed')
    push.error({
      title: i18n.global.t('failed'),
      message,
    })
  } finally {
    loading.value = false
  }
}

const changeLocale = (l: string) => {
  const next = l || 'en'
  i18nLocale.value = next
  vuetifyLocale.current.value = next
  localStorage.setItem('locale', next)
}

const changeTheme = (th: 'light' | 'dark' | 'system') => {
  theme.change(th)
  localStorage.setItem('theme', th)
}
</script>

<style scoped>
.sui-login-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.sui-login-topbar {
  flex: 0 0 auto;
}

.sui-login-stage {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 16px 56px;
}

.sui-login-card {
  width: 100%;
  max-width: 420px;
  padding: 32px 28px;
  box-shadow: var(--sui-shadow-card);
}

.sui-login-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-surface));
}

.sui-login-subtitle {
  font-size: 0.875rem;
  line-height: 1.4;
}

@media (max-width: 599.98px) {
  .sui-login-card {
    padding: 24px 20px;
  }
}
</style>
