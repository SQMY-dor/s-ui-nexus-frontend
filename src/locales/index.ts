import { createI18n } from 'vue-i18n'
import en from './en'
import fa from './fa'
import vi from './vi'
import zhcn from './zhcn'
import zhtw from './zhtw'
import ru from './ru'
import ja from './ja'
import fr from './fr'
import la from './la'
import { withNexus } from './nexus'

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("locale") ?? 'en',
  fallbackLocale: 'en',
  messages: {
    en: withNexus('en', en),
    fa: withNexus('fa', fa),
    vi: withNexus('vi', vi),
    zhHans: withNexus('zhHans', zhcn),
    zhHant: withNexus('zhHant', zhtw),
    ru: withNexus('ru', ru),
    ja: withNexus('ja', ja),
    fr: withNexus('fr', fr),
    la: withNexus('la', la),
  },

})

export const locale = (() => {
  const l = i18n.global.locale.value
  switch (l) {
    case "zhHans":
      return "zh-cn"
    case "zhHant":
      return "zh-tw"
    default:
      return l
  }
})()

export const languages = [
  { title: 'English', value: 'en' },
  { title: 'فارسی', value: 'fa' },
  { title: 'Tiếng Việt', value: 'vi' },
  { title: '简体中文', value: 'zhHans' },
  { title: '繁體中文', value: 'zhHant' },
  { title: 'Русский', value: 'ru' },
  { title: '日本語', value: 'ja' },
  { title: 'Français', value: 'fr' },
  { title: 'Latina', value: 'la' },
]
