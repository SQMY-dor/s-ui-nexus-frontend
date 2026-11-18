<template>
  <v-card subtitle="ECH" style="background-color: inherit;">
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-switch color="primary" :label="$t('enable')" v-model="enabled" hide-details></v-switch>
      </v-col>
    </v-row>
    <template v-if="enabled">
      <v-row>
        <v-col cols="auto">
          <v-btn-toggle v-model="useEchPath"
          class="rounded-xl"
          density="compact"
          variant="outlined"
          shaped
          mandatory>
            <v-btn
              @click="delete ech.key"
            >{{ $t('tls.usePath') }}</v-btn>
            <v-btn
              @click="delete ech.key_path"
            >{{ $t('tls.useText') }}</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-spacer></v-spacer>
        <v-col cols="auto">
          <v-btn
            variant="tonal"
            density="compact"
            icon="mdi-key-star"
            @click="genDialog = true"
            :loading="loading">
            <v-icon />
            <v-tooltip activator="parent" location="top">
              {{ $t('actions.generate') }}
            </v-tooltip>
          </v-btn>
        </v-col>
      </v-row>
      <v-row v-if="useEchPath == 0">
        <v-col cols="12">
          <v-text-field
            :label="$t('tls.keyPath')"
            hide-details
            v-model="ech.key_path">
          </v-text-field>
        </v-col>
      </v-row>
      <v-row v-else>
        <v-col cols="12">
          <v-textarea
            :label="$t('tls.key')"
            hide-details
            v-model="echKeyText">
          </v-textarea>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" sm="6" v-if="oTls.ech">
          <v-text-field
            :label="$t('tls.queryServerName')"
            :disabled="queryLocked"
            :hint="hasConfig ? $t('tls.echQueryDisabled') : ''"
            :persistent-hint="hasConfig"
            :hide-details="!hasConfig"
            v-model="oTls.ech.query_server_name"
            placeholder="ech.example.com">
          </v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-textarea
            :label="$t('tls.cert')"
            hide-details
            v-model="echConfigText">
          </v-textarea>
        </v-col>
      </v-row>
    </template>
    <v-dialog v-model="genDialog" max-width="520">
      <v-card :title="$t('tls.echPublicName')">
        <v-divider />
        <v-card-text>
          <p class="mb-3">{{ $t('tls.echPublicNameAbout') }}</p>
          <p class="mb-4 text-medium-emphasis">{{ $t('tls.echQueryAbout') }}</p>
          <v-text-field
            v-model="publicName"
            :label="$t('tls.echPublicName')"
            placeholder="public.example.com"
            dir="ltr"
            hide-details
            autofocus
            @keydown.enter="onPublicNameEnter"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="outlined" @click="genDialog = false">{{ $t('actions.close') }}</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="loading"
            :disabled="publicName.trim() == ''"
            @click="genECH">{{ $t('actions.generate') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts">
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { ech } from '@/types/tls'
import { push } from 'notivue'
import { asLines, echHasConfig, echQueryLocked, splitEchPems } from '@/plugins/ech'

export default {
  props: ['iTls','oTls'],
  data() {
    return {
      useEchPath: this.$props.iTls?.ech?.key? 1:0,
      loading: false,
      // The public name is the cleartext outer SNI baked into the generated
      // config: asked for on generate (it used to be the inbound's own
      // server_name, which put the name ECH hides in the clear). sing-box keeps
      // no field for it. Upstream s-ui-frontend 3235da1 via shenaba/2s-ui.
      genDialog: false,
      publicName: '',
    }
  },
  methods: {
    onPublicNameEnter(e: KeyboardEvent) {
      // Enter that confirms an IME composition is not a request to generate.
      if (e.isComposing || e.keyCode === 229) return
      this.genECH()
    },
    async genECH(){
      const name = this.publicName.trim()
      if (name == '') return
      this.loading = true
      const msg = await HttpUtils.get('api/keypairs', {
        k: "ech",
        o: name
      })
      this.loading = false
      if (msg.success && this.iTls.ech && this.oTls.ech) {
        this.genDialog = false
        this.iTls.ech.key_path=undefined
        this.useEchPath = 1
        if (msg.obj.length>0){
          const { config, key } = splitEchPems(<string[]>msg.obj)
          this.iTls.ech.key = key.length > 0 ? key : undefined
          this.oTls.ech.config = config.length > 0 ? config : undefined
          // Has no effect next to the config just written
          delete this.oTls.ech.query_server_name
        } else {
          push.error({
            message: i18n.global.t('error') + ": " + msg.obj
          })
        }
      }
    },
  },
  computed: {
    ech() {
      return <ech>this.$props.iTls.ech
    },
    enabled: {
      get() { return this.ech?.enabled?? false },
      set(v: boolean) { 
        this.$props.iTls.ech = v ? { enabled: true } : undefined
        this.$props.oTls.ech = v ? {} : undefined
      }
    },
    // A key or config stored as one string (sing-box Listable) is read as
    // lines instead of breaking the drawer.
    echKeyText: {
      get(): string { return asLines(this.ech?.key).join('\n') },
      set(newValue:string) { this.ech.key = newValue.split('\n') }
    },
    echConfigText: {
      get(): string { return asLines(this.oTls.ech?.config).join('\n') },
      set(newValue:string) { this.oTls.ech.config = newValue.split('\n') }
    },
    // A client with a config uses it and never looks one up, so the query
    // name only matters while the config is empty.
    hasConfig(): boolean { return echHasConfig(this.oTls.ech?.config) },
    // Locked only while it is empty next to a config: one already set stays
    // editable so it can be cleared.
    queryLocked(): boolean { return echQueryLocked(this.oTls.ech) },
  }
}
</script>