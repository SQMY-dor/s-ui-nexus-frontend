<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog transition="dialog-bottom-transition" width="600" :model-value="visible" @update:model-value="v => { if (!v) emit('close') }">
    <v-card class="rounded-lg" :loading="busy">
      <v-card-title>{{ editing ? $t('cert.editPaths') : $t('cert.register') }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div class="text-medium-emphasis mb-4">{{ $t('cert.registerHint') }}</div>
        <v-text-field v-model="form.domain" dir="ltr" :label="$t('cert.domain')" placeholder="cf.example.com" :disabled="editing"
          :error-messages="form.domain && !domainOk ? $t('cert.err.domain') : ''" />
        <v-text-field v-model="form.certFile" dir="ltr" :label="$t('setting.sslCert')" placeholder="/etc/ssl/example/fullchain.pem"
          :error-messages="form.certFile && !certOk ? $t('cert.err.absPath') : ''" />
        <v-text-field v-model="form.keyFile" dir="ltr" :label="$t('setting.sslKey')" placeholder="/etc/ssl/example/privkey.pem"
          :error-messages="form.keyFile && !keyOk ? $t('cert.err.absPath') : ''" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="emit('close')">{{ $t('actions.close') }}</v-btn>
        <v-btn color="primary" variant="tonal" :loading="busy" :disabled="!domainOk || !certOk || !keyOk" @click="save">{{ $t('actions.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { push } from 'notivue'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { isAbsolutePath, isValidCertDomain, type CertInfo } from '@/plugins/certs'

const props = defineProps<{ visible: boolean, cert?: CertInfo | null }>()
const emit = defineEmits<{ close: [], saved: [] }>()

const form = ref({ domain: '', certFile: '', keyFile: '' })
const busy = ref(false)
const editing = computed(() => !!props.cert)

const domainOk = computed(() => isValidCertDomain(form.value.domain.trim().toLowerCase()))
const certOk = computed(() => isAbsolutePath(form.value.certFile))
const keyOk = computed(() => isAbsolutePath(form.value.keyFile))

watch(() => props.visible, (v) => {
  if (v) form.value = props.cert
    ? { domain: props.cert.domain, certFile: props.cert.certFile, keyFile: props.cert.keyFile }
    : { domain: '', certFile: '', keyFile: '' }
})

const save = async () => {
  busy.value = true
  const msg = await HttpUtils.post('api/saveManualCert', {
    domain: form.value.domain.trim().toLowerCase(),
    certFile: form.value.certFile.trim(),
    keyFile: form.value.keyFile.trim(),
  })
  busy.value = false
  if (msg.success) {
    push.success({ title: i18n.global.t('success'), duration: 5000, message: i18n.global.t('cert.registered') })
    emit('saved')
    emit('close')
  }
}
</script>
