import { PrismaPg } from "@prisma/adapter-pg"
import pkg from "@prisma/client"
import { AppointmentConflictError, AppointmentService } from "./appointment.service.js"

const { PrismaClient } = pkg
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function normalizeText(value = "") {
  const normalized = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:/\s-]+/gu, " ")
    .replace(/\b(\p{L})\1{2,}\b/gu, "$1")
    .replace(/\s+/g, " ")
    .trim()

  return expandCommonAbbreviations(normalized)
}

function isNumericToken(value = "") {
  return /^\d+$/.test(String(value).trim())
}

function expandCommonAbbreviations(value = "") {
  const replacements = [
    [/\bvcs?\b/g, "voce"],
    [/\bvc\b/g, "voce"],
    [/\bvocee+\b/g, "voce"],
    [/\bq\b/g, "que"],
    [/\bpq\b/g, "porque"],
    [/\bpk\b/g, "porque"],
    [/\bporq\b/g, "porque"],
    [/\bqr\b/g, "quero"],
    [/\bqro\b/g, "quero"],
    [/\bkero\b/g, "quero"],
    [/\bqria\b/g, "queria"],
    [/\bqd\b/g, "quando"],
    [/\bhrs?\b/g, "horario"],
    [/\bhr\b/g, "horario"],
    [/\bhrs\b/g, "horario"],
    [/\bblz\b/g, "beleza"],
    [/\bmsg\b/g, "mensagem"],
    [/\bag\b/g, "agora"],
    [/\bhj\b/g, "hoje"],
    [/\btd\b/g, "tudo"],
    [/\bt+\s*bem\b/g, "tudo bem"],
    [/\bamanhaa+\b/g, "amanha"],
    [/\bamanh[ae]\b/g, "amanha"],
    [/\bdsclp\b/g, "desculpa"],
    [/\bobg\b/g, "obrigado"],
    [/\bobgd\b/g, "obrigado"],
    [/\bobrigad[ao]o+\b/g, "obrigado"],
    [/\btbm\b/g, "tambem"],
    [/\btb\b/g, "tambem"],
    [/\bpoderia\s+ser\b/g, "pode ser"],
    [/\bpd\s+ser\b/g, "pode ser"],
    [/\bpode\s+se\b/g, "pode ser"],
    [/\bpdp\b/g, "pode"],
    [/\bcmg\b/g, "comigo"],
    [/\bctg\b/g, "contigo"],
    [/\bc\/\b/g, "com "],
    [/\bs\/\b/g, "sem "],
    [/\bhorar?io\b/g, "horario"],
    [/\bagendr\b/g, "agendar"],
    [/\bagendamnto\b/g, "agendamento"],
    [/\bagend\b/g, "agendar"],
    [/\bmarc[ae]r\b/g, "marcar"],
    [/\bserv\b/g, "servico"],
    [/\bprof\b/g, "profissional"],
    [/\bfunc\b/g, "funcionario"],
    [/\bcartaoo+\b/g, "cartao"],
    [/\bpixx+\b/g, "pix"],
    [/\bnaum\b/g, "nao"],
    [/\bneh\b/g, "nao"],
    [/\bnum\b/g, "nao"],
    [/\bn\b/g, "nao"],
    [/\bss\b/g, "sim"],
    [/\bsimm+\b/g, "sim"],
    [/\bvlw\b/g, "valeu"],
    [/\bobgda\b/g, "obrigado"],
  ]

  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

function includesAnyNormalizedTerm(message = "", terms = []) {
  const normalizedMessage = normalizeText(message)
  return terms.some((term) => normalizedMessage.includes(normalizeText(term)))
}

function pad(value) {
  return String(value).padStart(2, "0")
}

function firstName(name = "Cliente") {
  return String(name).trim().split(/\s+/)[0] || "Cliente"
}

function professionalArticle(name = "") {
  const normalized = normalizeText(firstName(name))

  if (normalized.endsWith("a")) return "a"
  return "o"
}

function professionalReference(name = "") {
  const shortName = firstName(name)
  return `${professionalArticle(shortName)} ${shortName}`.trim()
}

function removeDuplicateStrings(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function uniqueNonEmptyStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
}

function formatCurrency(value) {
  return Number(value || 0).toFixed(2).replace(".", ",")
}

function previewServices(services = [], limit = 3) {
  return services
    .slice(0, limit)
    .map((service) => service.name)
    .filter(Boolean)
    .join(", ")
}

function formatDateLabel(dateValue) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.APP_TIMEZONE || "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateValue))
}

function formatTimeLabel(dateValue) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.APP_TIMEZONE || "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateValue))
}

function formatWeekDayLabel(weekDay) {
  const labels = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ]

  return labels[Number(weekDay)] || "dia não informado"
}

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function addDays(date, days) {
  const value = new Date(date)
  value.setDate(value.getDate() + Number(days || 0))
  return value
}

export class WhatsAppAppointmentAssistantService {
  constructor() {
    this.appointmentService = new AppointmentService()
  }

  getTimeZone() {
    return process.env.APP_TIMEZONE || "America/Sao_Paulo"
  }

  isAffirmative(message = "") {
    const normalized = normalizeText(message)
    return [
      "sim",
      "s",
      "ss",
      "pode",
      "pode sim",
      "pode ser",
      "confirmo",
      "confirmar",
      "ok",
      "okk",
      "blz",
      "beleza",
      "fechado",
      "isso",
      "quero",
      "quero sim",
      "pode confirmar",
      "confirmado",
      "isso mesmo",
      "essa mesmo",
      "esse mesmo",
      "pode marcar",
      "pode agendar",
    ].includes(normalized)
  }

  isNegative(message = "") {
    const normalized = normalizeText(message)
    return [
      "nao",
      "n",
      "na",
      "nao quero",
      "cancelar",
      "deixa",
      "outro horario",
      "outro dia",
      "melhor nao",
      "agora nao",
      "nao precisa",
      "nao quero mais",
    ].includes(normalized)
  }

  isNoSchedulingIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "nao quero agendar",
      "não quero agendar",
      "nao quero marcar",
      "não quero marcar",
      "agora nao",
      "agora não",
      "depois eu vejo",
      "depois eu chamo",
      "so queria saber",
      "só queria saber",
      "só queria perguntar",
      "so queria perguntar",
      "por enquanto nao",
      "por enquanto não",
      "so estou olhando",
      "só estou olhando",
      "so quero ver",
      "só quero ver",
    ])
  }

  isHumanHandoffIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "quero falar com atendente",
      "quero falar com uma pessoa",
      "quero falar com alguem",
      "quero falar com humano",
      "quero falar com suporte",
      "me passa para atendente",
      "me passa para uma pessoa",
      "me passa para o suporte",
      "prefiro falar com alguem",
      "prefiro falar com uma pessoa",
      "prefiro falar com atendente",
      "prefiro falar com suporte",
      "chama atendente",
      "chama suporte",
      "atendente",
      "suporte humano",
      "atendimento humano",
      "falar com suporte",
      "falar com atendente",
      "falar com humano",
      "nao quero falar com bot",
      "não quero falar com bot",
      "sem chatbot",
      "sem robô",
      "sem robo",
      "falar com pessoa real",
      "quero atendimento humano",
    ])
  }

  isBotResumeIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "retornar atendimento",
      "retorna atendimento",
      "retomar atendimento",
      "retoma atendimento",
      "voltar atendimento",
      "volta atendimento",
      "voltar",
      "volta",
      "atendimento",
      "agendamento",
      "oi",
      "quero agendar",
      "quero marcar",
      "quero remarcar",
      "quero cancelar",
      "pode continuar",
      "pode me ajudar",
      "pode responder",
      "pode voltar",
      "vamos continuar",
      "vamos seguir",
      "pode seguir",
      "segue comigo",
      "segue aqui",
      "continuar por aqui",
      "voltei",
      "agora quero agendar",
      "agora quero marcar",
      "me ajuda a agendar",
      "me ajuda a marcar",
      "voltei aqui",
      "vamos retomar",
      "quero continuar",
      "continuar atendimento",
    ])
  }

  isSchedulingIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "agendar",
      "agendamento",
      "marcar",
      "marcacao",
      "marcamento",
      "horario",
      "disponibilidade",
      "disponivel",
      "agenda",
      "quero fazer",
      "quero um horario",
      "gostaria de agendar",
      "posso marcar",
      "quero com",
      "tem horario com",
      "tem horario para",
      "tem vaga",
      "quero atendimento com",
      "consigo marcar",
      "queria marcar",
      "queria agendar",
      "preciso agendar",
      "quero agendar",
      "ver horario",
      "ver disponibilidade",
      "ter horario",
      "encaixe",
    ])
  }

  isRestartIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "reiniciar",
      "recomecar",
      "recomecar",
      "comecar de novo",
      "comecar de novo",
      "voltar do inicio",
      "novo atendimento",
      "zera tudo",
      "do zero",
    ])
  }

  isGreetingIntent(message = "") {
    const normalized = normalizeText(message)

    return [
      "oi",
      "ola",
      "olá",
      "bom dia",
      "boa tarde",
      "boa noite",
      "e ai",
      "iae",
      "hey",
      "opa",
    ].includes(normalized)
  }

  isPaymentIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "pagamento",
      "pagamentos",
      "forma de pagamento",
      "formas de pagamento",
      "metodo de pagamento",
      "metodos de pagamento",
      "aceita cartao",
      "aceita pix",
      "pix",
      "cartao",
      "dinheiro",
      "como posso pagar",
      "formas de pagar",
    ])
  }

  isCancellationIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "cancelamento",
      "cancelar agendamento",
      "cancelar meu agendamento",
      "cancelar meu horario",
      "cancelar horario",
      "cancelar marcacao",
      "cancelar minha reserva",
      "quero cancelar",
      "preciso cancelar",
      "desistir do agendamento",
      "tirar meu agendamento",
      "desmarcar",
      "nao vou conseguir ir",
      "não vou conseguir ir",
      "nao poderei ir",
      "não poderei ir",
      "preciso desmarcar",
      "quero desmarcar",
    ])
  }

  isRescheduleIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "reagendamento",
      "reagendar",
      "remarcar",
      "remarcacao",
      "remarcação",
      "mudar agendamento",
      "mudar horario",
      "mudar meu horario",
      "trocar horario",
      "trocar dia",
      "alterar agendamento",
      "alterar horario",
      "quero remarcar",
      "preciso remarcar",
      "quero reagendar",
      "outro horario para meu agendamento",
      "mudar minha reserva",
      "jogar para outro dia",
    ])
  }

  isAppointmentLookupIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "meus agendamentos",
      "meu agendamento",
      "meus horarios",
      "meus horarios marcados",
      "tenho horario marcado",
      "tenho agendamento",
      "quais agendamentos tenho",
      "quais horarios tenho",
      "quais horarios estao marcados",
      "quais horarios estão marcados",
      "me fala meus horarios",
      "me fala meus agendamentos",
      "consultar agendamento",
      "consultar meus agendamentos",
      "ver agendamento",
      "ver meus agendamentos",
      "listar agendamentos",
      "agendamentos marcados",
      "agendamentos pendentes",
      "agendamentos confirmados",
      "quais agendamentos pendentes tenho",
      "quais agendamentos confirmados tenho",
      "tenho algum agendamento pendente",
      "tenho algum agendamento confirmado",
      "quero ver meus horarios",
      "quero ver meus agendamentos",
      "consultar meus horarios",
    ])
  }

  isAmenitiesIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "comodidade",
      "comodidades",
      "estrutura",
      "espaco",
      "ambiente",
      "wifi",
      "estacionamento",
      "acessibilidade",
      "ar condicionado",
      "cafe",
      "banheiro",
      "local tem",
      "o espaco tem",
    ])
  }

  isServiceInfoIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "valor",
      "preco",
      "preços",
      "preco do",
      "quanto custa",
      "quanto fica",
      "qual o valor",
      "qual valor",
      "preço",
      "preço do",
      "preço da",
      "duracao",
      "duração",
      "quanto tempo",
      "sobre o servico",
      "sobre o serviço",
      "como funciona",
      "informacao do servico",
      "informação do serviço",
      "detalhes do servico",
      "detalhes do serviço",
      "quanto e",
      "quanto é",
    ])
  }

  isProfessionalInfoIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "profissional",
      "profissionais",
      "quem faz",
      "quem atende",
      "quem trabalha",
      "com quem posso fazer",
      "quem realiza",
      "quem pode fazer",
      "quem faz esse servico",
      "quem faz esse serviço",
      "a re faz",
      "a renata faz",
      "quem atende esse servico",
      "quem atende esse serviço",
    ])
  }

  isProfessionalScheduleIntent(message = "") {
    return includesAnyNormalizedTerm(message, [
      "horarios da",
      "horários da",
      "agenda da",
      "horarios do",
      "horários do",
      "agenda do",
      "que horas",
      "atende",
      "expediente",
      "disponibilidade da",
      "disponibilidade do",
      "quero com",
      "tem horario com",
      "tem horários com",
      "tem vaga com",
      "a re atende",
      "a renata atende",
      "quando atende",
      "que dia atende",
      "quais horarios da",
      "quais horarios do",
    ])
  }

  wantsToChangeService(message = "", currentService = null) {
    const normalized = normalizeText(message)
    if (!currentService) return false

    const mentionsChange = [
      "trocar servico",
      "trocar serviço",
      "mudar servico",
      "mudar serviço",
      "outro servico",
      "outro serviço",
      "prefiro outro",
      "quero outro servico",
      "quero outro serviço",
    ].some((term) => normalized.includes(normalizeText(term)))

    return mentionsChange
  }

  extractOptionIndex(message = "", optionsLength = 0) {
    const normalized = normalizeText(message)
    const match = normalized.match(/(?:^|\b)(\d{1,2})(?:\b|$)/)
    let index = null

    if (match) {
      index = Number(match[1]) - 1
    } else {
      const ordinalMap = [
        ["primeiro", 0],
        ["primeira", 0],
        ["segundo", 1],
        ["segunda", 1],
        ["terceiro", 2],
        ["terceira", 2],
        ["quarto", 3],
        ["quarta", 3],
        ["quinto", 4],
        ["quinta", 4],
      ]
      const ordinalEntry = ordinalMap.find(([term]) => normalized.includes(term))
      index = ordinalEntry ? ordinalEntry[1] : null
    }

    if (index === null) return null
    if (index < 0 || index >= optionsLength) return null

    return index
  }

  inferLocalIntent(message = "", previousState = null) {
    if (!message?.trim()) return "unknown"

    if (previousState?.phase === "awaiting_confirmation") {
      if (this.isAffirmative(message)) return "affirmative"
      if (this.isNegative(message)) return "negative"
    }

    if (this.isHumanHandoffIntent(message)) return "human_handoff"
    if (this.isBotResumeIntent(message)) return "bot_resume"
    if (this.isGreetingIntent(message)) return "greeting"
    if (this.isRestartIntent(message)) return "restart"
    if (this.isNoSchedulingIntent(message)) return "no_scheduling"
    if (this.isCancellationIntent(message)) return "cancellation"
    if (this.isRescheduleIntent(message)) return "reschedule"
    if (this.isAppointmentLookupIntent(message)) return "appointment_lookup"
    if (this.isPaymentIntent(message)) return "payment"
    if (this.isAmenitiesIntent(message)) return "amenities"
    if (this.isServiceInfoIntent(message)) return "service_info"
    if (this.isProfessionalInfoIntent(message)) return "professional_info"
    if (this.isProfessionalScheduleIntent(message)) return "professional_schedule"
    if (this.isSchedulingIntent(message)) return "scheduling"
    if (previousState?.phase && previousState.phase !== "completed") return "conversation_continuation"

    return "unknown"
  }

  shouldUseInterpretationFallback({
    companyProfile,
    customerMessage,
    latestInteraction,
  }) {
    const previousState = this.getConversationState(latestInteraction)
    const localIntent = this.inferLocalIntent(customerMessage, previousState)

    if (localIntent !== "unknown") {
      return {
        shouldUseAi: false,
        localIntent,
      }
    }

    const services = companyProfile?.services || []
    const professionals = companyProfile?.professionals || []
    const normalizedMessage = normalizeText(customerMessage)
    const hasEntitySignals =
      this.getServiceCandidates(normalizedMessage, services).length > 0 ||
      this.getProfessionalCandidates(normalizedMessage, professionals).length > 0
    const hasDateOrTimeSignals = Boolean(
      this.parseDateFromMessage(normalizedMessage) ||
      this.parseTimeFromMessage(normalizedMessage) ||
      this.parsePeriodFromMessage(normalizedMessage),
    )
    const hasOptionSelection = this.extractOptionIndex(
      normalizedMessage,
      Math.max(previousState?.serviceOptions?.length || 0, previousState?.slotOptions?.length || 0),
    ) !== null

    return {
      shouldUseAi: !(hasEntitySignals || hasDateOrTimeSignals || hasOptionSelection),
      localIntent,
    }
  }

  getConversationState(latestInteraction) {
    const data = latestInteraction?.data

    if (!data || typeof data !== "object") return null

    return data.conversationState && typeof data.conversationState === "object"
      ? data.conversationState
      : null
  }

  getSelectedServiceFromState(state, services = []) {
    if (!state?.serviceId) return null
    return services.find((service) => service.id === Number(state.serviceId)) || null
  }

  getSelectedProfessionalFromState(state, professionals = []) {
    if (!state?.employeeId) return null
    return professionals.find((professional) => professional.id === Number(state.employeeId)) || null
  }

  shouldResumeFromHumanHandoff(message = "", intentCategory = "unknown", previousState = null) {
    const normalizedIntent = String(intentCategory || "unknown").trim().toLowerCase()
    const resumeEligibleIntents = new Set([
      "affirmative",
      "negative",
      "bot_resume",
      "restart",
      "scheduling",
      "cancellation",
      "reschedule",
      "appointment_lookup",
      "payment",
      "amenities",
      "service_info",
      "professional_info",
      "professional_schedule",
      "conversation_continuation",
    ])

    if (this.isHumanHandoffIntent(message) || normalizedIntent === "human_handoff") {
      return false
    }

    if (this.isBotResumeIntent(message) || resumeEligibleIntents.has(normalizedIntent)) {
      return true
    }

    return false
  }

  findServiceByHint(hint = "", services = []) {
    const normalizedHint = normalizeText(hint)
    if (!normalizedHint) return null

    const candidates = this.getServiceCandidates(normalizedHint, services)
    if (candidates.length === 1) return candidates[0].service

    return services.find((service) => {
      const serviceName = normalizeText(service.name)
      return serviceName === normalizedHint || serviceName.includes(normalizedHint) || normalizedHint.includes(serviceName)
    }) || null
  }

  findProfessionalByHint(hint = "", professionals = []) {
    const normalizedHint = normalizeText(hint)
    if (!normalizedHint) return null

    const candidates = this.getProfessionalCandidates(normalizedHint, professionals)
    if (candidates.length === 1) return candidates[0].professional

    return professionals.find((professional) => {
      const professionalName = normalizeText(professional.name)
      return (
        professionalName === normalizedHint ||
        professionalName.includes(normalizedHint) ||
        normalizedHint.includes(professionalName)
      )
    }) || null
  }

  getServiceCandidates(message = "", services = []) {
    const normalizedMessage = normalizeText(message)

    const candidates = services
      .map((service) => {
        const name = normalizeText(service.name)
        const description = normalizeText(service.description || "")
        const haystack = `${name} ${description}`.trim()
        const tokens = [...new Set(name.split(/\s+/).filter((token) => token.length >= 3))]
        let score = 0

        if (normalizedMessage.includes(name)) {
          score += 100
        }

        if (description && normalizedMessage.includes(description)) {
          score += 40
        }

        tokens.forEach((token) => {
          if (normalizedMessage.includes(token)) score += 8
        })

        if (normalizedMessage.includes(normalizeText(service.category || ""))) {
          score += 4
        }

        return {
          service,
          score,
          haystack,
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name))

    if (candidates.length === 0) return []

    const bestScore = candidates[0].score
    return candidates.filter((item) => item.score >= Math.max(8, bestScore - 8))
  }

  getProfessionalCandidates(message = "", professionals = []) {
    const normalizedMessage = normalizeText(message)

    const candidates = professionals
      .map((professional) => {
        const name = normalizeText(professional.name)
        const role = normalizeText(professional.role || "")
        const tokens = [...new Set(
          name.split(/\s+/).filter((token) => token.length >= 2 && !isNumericToken(token)),
        )]
        const aliases = this.buildProfessionalAliases(professional)
        let score = 0

        if (name && normalizedMessage.includes(name)) {
          score += 100
        }

        tokens.forEach((token) => {
          if (normalizedMessage.includes(token)) score += 12
        })

        aliases.forEach((alias) => {
          if (!alias) return

          const aliasPattern = new RegExp(`(^|\\s)${alias}(?=\\s|$)`)
          if (aliasPattern.test(normalizedMessage)) {
            score += alias.length <= 3 ? 40 : 70
          } else if (normalizedMessage.includes(alias)) {
            score += alias.length <= 3 ? 18 : 36
          }
        })

        if (role && normalizedMessage.includes(role)) {
          score += 6
        }

        return {
          professional,
          score,
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.professional.name.localeCompare(b.professional.name))

    if (candidates.length === 0) return []

    const bestScore = candidates[0].score
    return candidates.filter((item) => item.score >= Math.max(12, bestScore - 8))
  }

  getRelevantServices(message = "", services = [], limit = 5) {
    const candidates = this.getServiceCandidates(message, services)

    if (candidates.length > 0) {
      return candidates.slice(0, limit).map((item) => item.service)
    }

    return services.slice(0, limit)
  }

  getRelevantProfessionals(message = "", professionals = [], limit = 5) {
    const candidates = this.getProfessionalCandidates(message, professionals)

    if (candidates.length > 0) {
      return candidates.slice(0, limit).map((item) => item.professional)
    }

    return professionals.slice(0, limit)
  }

  buildProfessionalAliases(professional) {
    const normalizedName = normalizeText(professional?.name || "")
    const parts = normalizedName.split(/\s+/).filter(Boolean)
    const aliases = []

    if (parts.length === 0) return []

    const first = parts[0]
    if (!isNumericToken(first)) {
      aliases.push(first)
    }

    if (!isNumericToken(first) && first.length >= 2) {
      aliases.push(first.slice(0, 2))
    }

    if (!isNumericToken(first) && first.length >= 3) {
      aliases.push(first.slice(0, 3))
    }

    parts.forEach((part) => {
      if (isNumericToken(part)) return

      aliases.push(part)

      if (part.length >= 2) aliases.push(part.slice(0, 2))
      if (part.length >= 3) aliases.push(part.slice(0, 3))
    })

    return removeDuplicateStrings(aliases)
  }

  parseDateFromMessage(message = "", now = new Date()) {
    const normalized = normalizeText(message)
    const baseDate = startOfDay(now)

    if (normalized.includes("depois de depois de amanha")) {
      return this.toDateString(addDays(baseDate, 3))
    }

    if (
      ["depois de amanha", "depois d amanha", "depois de amnh", "daqui a dois dias"].some((term) =>
        normalized.includes(normalizeText(term)),
      )
    ) {
      return this.toDateString(addDays(baseDate, 2))
    }

    if (
      ["daqui a tres dias", "daqui tres dias"].some((term) =>
        normalized.includes(normalizeText(term)),
      )
    ) {
      return this.toDateString(addDays(baseDate, 3))
    }

    if (normalized.includes("hoje")) {
      return this.toDateString(baseDate)
    }

    if (
      ["amanha", "amanhã"].some((term) => normalized.includes(normalizeText(term)))
    ) {
      return this.toDateString(addDays(baseDate, 1))
    }

    if (
      ["depois", "outro dia"].some((term) => normalized === normalizeText(term))
    ) {
      return this.toDateString(addDays(baseDate, 1))
    }

    if (
      ["fim de semana", "final de semana", "no sabado", "no domingo"].some((term) =>
        normalized.includes(normalizeText(term)),
      )
    ) {
      const saturday = new Date(baseDate)
      const currentWeekDay = saturday.getDay()
      const distance = (6 - currentWeekDay + 7) % 7 || 7
      saturday.setDate(saturday.getDate() + distance)
      return this.toDateString(saturday)
    }

    const explicitDate = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
    if (explicitDate) {
      const day = Number(explicitDate[1])
      const month = Number(explicitDate[2])
      const yearRaw = explicitDate[3]
      const currentYear = baseDate.getFullYear()
      let year = yearRaw ? Number(yearRaw) : currentYear

      if (year < 100) year += 2000

      const parsed = new Date(year, month - 1, day)

      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        if (!yearRaw && startOfDay(parsed) < baseDate) {
          parsed.setFullYear(parsed.getFullYear() + 1)
        }

        return this.toDateString(parsed)
      }
    }

    const weekdays = {
      domingo: 0,
      segunda: 1,
      "segunda feira": 1,
      terca: 2,
      "terca feira": 2,
      quarta: 3,
      "quarta feira": 3,
      quinta: 4,
      "quinta feira": 4,
      sexta: 5,
      "sexta feira": 5,
      sabado: 6,
    }

    for (const [label, weekDay] of Object.entries(weekdays)) {
      if (!normalized.includes(label)) continue

      const candidate = new Date(baseDate)
      const currentWeekDay = candidate.getDay()
      let distance = (weekDay - currentWeekDay + 7) % 7

      const asksNextWeek = [
        "proxima",
        "próxima",
        "que vem",
        "semana que vem",
      ].some((term) => normalized.includes(normalizeText(term)))

      if (distance === 0 || asksNextWeek) {
        distance = distance === 0 ? 7 : distance
      }

      candidate.setDate(candidate.getDate() + distance)
      return this.toDateString(candidate)
    }

    return null
  }

  parseTimeFromMessage(message = "") {
    const normalized = normalizeText(message)
    const explicitMatch = normalized.match(/\b(\d{1,2})(?:[:h](\d{2}))\b/)
    const shortHourMatch = normalized.match(/\b(\d{1,2})h\b/)
    const contextualHourMatch = normalized.match(/\b(?:as|para|pra|por volta de|umas?)\s+(\d{1,2})\b/)
    const isolatedHourMatch = normalized.match(/^(\d{1,2})$/)

    if (["meio dia", "meiodia"].some((term) => normalized.includes(normalizeText(term)))) {
      return "12:00"
    }

    if (["meia noite"].some((term) => normalized.includes(normalizeText(term)))) {
      return "00:00"
    }

    if (["fim da manha", "final da manha"].some((term) => normalized.includes(normalizeText(term)))) {
      return "11:00"
    }

    if (["comeco da tarde", "inicio da tarde"].some((term) => normalized.includes(normalizeText(term)))) {
      return "13:00"
    }

    if (["fim da tarde", "final da tarde"].some((term) => normalized.includes(normalizeText(term)))) {
      return "17:00"
    }

    if (["comeco da noite", "inicio da noite"].some((term) => normalized.includes(normalizeText(term)))) {
      return "18:00"
    }

    let match = explicitMatch || shortHourMatch || contextualHourMatch || isolatedHourMatch

    if (!match) return null

    const hour = Number(match[1])
    const minute = Number(match[2] || "00")

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

    return `${pad(hour)}:${pad(minute)}`
  }

  parsePeriodFromMessage(message = "") {
    const normalized = normalizeText(message)

    if (
      [
        "manha",
        "manhã",
        "de manha",
        "de manhã",
        "pela manha",
        "pela manhã",
        "cedo",
        "bem cedo",
        "no comeco da manha",
        "no inicio da manha",
      ].some((term) => normalized.includes(normalizeText(term)))
    ) {
      return { key: "morning", label: "de manhã" }
    }

    if (
      [
        "tarde",
        "a tarde",
        "à tarde",
        "de tarde",
        "pela tarde",
        "depois do almoco",
        "depois do almoço",
        "no comeco da tarde",
        "no inicio da tarde",
        "fim da tarde",
        "final da tarde",
      ].some((term) => normalized.includes(normalizeText(term)))
    ) {
      return { key: "afternoon", label: "à tarde" }
    }

    if (
      [
        "noite",
        "a noite",
        "à noite",
        "de noite",
        "anoite",
        "no fim do dia",
        "fim do dia",
        "final do dia",
        "depois das seis",
        "mais tarde",
      ].some((term) => normalized.includes(normalizeText(term)))
    ) {
      return { key: "evening", label: "à noite" }
    }

    return null
  }

  toDateString(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  combineDateAndTime(dateString, timeString) {
    return new Date(`${dateString}T${timeString}:00-03:00`)
  }

  async getProfessionalsForService(companyId, serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
      select: {
        id: true,
        name: true,
        duration_minutes: true,
        company_id: true,
        employees: {
          select: {
            employee_id: true,
          },
        },
      },
    })

    if (!service || service.company_id !== Number(companyId)) {
      return { service: null, employees: [] }
    }

    let employees = []
    const employeeIds = service.employees.map((item) => item.employee_id)

    if (employeeIds.length > 0) {
      employees = await prisma.employee.findMany({
        where: {
          company_id: Number(companyId),
          id: { in: employeeIds },
          status: "ACTIVE",
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      })
    } else {
      employees = await prisma.employee.findMany({
        where: {
          company_id: Number(companyId),
          status: "ACTIVE",
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      })
    }

    return { service, employees }
  }

  async getEmployeeOpenings(companyId, employeeId, weekDay) {
    return prisma.scheduleOpening.findMany({
      where: {
        company_id: Number(companyId),
        employee_id: Number(employeeId),
        week_day: Number(weekDay),
      },
      orderBy: { start_time: "asc" },
      select: {
        start_time: true,
        end_time: true,
      },
    })
  }

  async getEmployeeAppointments(employeeId, dateString) {
    const start = new Date(`${dateString}T00:00:00-03:00`)
    const end = new Date(`${dateString}T23:59:59.999-03:00`)

    return prisma.appointment.findMany({
      where: {
        employee_id: Number(employeeId),
        status: { not: "CANCELED" },
        start_time: { lt: end },
        end_time: { gt: start },
      },
      orderBy: { start_time: "asc" },
      select: {
        start_time: true,
        end_time: true,
      },
    })
  }

  overlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB
  }

  async getServicesForProfessional(companyId, professionalId) {
    return prisma.service.findMany({
      where: {
        company_id: Number(companyId),
        status: "ACTIVE",
        employees: {
          some: {
            employee_id: Number(professionalId),
          },
        },
      },
      orderBy: [{ price: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        duration_minutes: true,
        price: true,
      },
    })
  }

  async getProfessionalWeeklyOpenings(companyId, professionalId) {
    return prisma.scheduleOpening.findMany({
      where: {
        company_id: Number(companyId),
        employee_id: Number(professionalId),
      },
      orderBy: [{ week_day: "asc" }, { start_time: "asc" }],
      select: {
        week_day: true,
        start_time: true,
        end_time: true,
      },
    })
  }

  async getAvailableSlots({ companyId, serviceId, dateString, limit = 5, employeeId = null }) {
    const requestedDate = new Date(`${dateString}T12:00:00-03:00`)
    const weekDay = requestedDate.getDay()
    const { service, employees } = await this.getProfessionalsForService(companyId, serviceId)

    if (!service || employees.length === 0) return []

    const filteredEmployees = employeeId
      ? employees.filter((employee) => employee.id === Number(employeeId))
      : employees

    if (filteredEmployees.length === 0) return []

    const slots = []

    for (const employee of filteredEmployees) {
      const [openings, appointments] = await Promise.all([
        this.getEmployeeOpenings(companyId, employee.id, weekDay),
        this.getEmployeeAppointments(employee.id, dateString),
      ])

      if (openings.length === 0) continue

      for (const opening of openings) {
        const openingStartMinutes = this.appointmentService.getMinutesInTimeZone(opening.start_time)
        const openingEndMinutes = this.appointmentService.getMinutesInTimeZone(opening.end_time)

        for (
          let startMinutes = openingStartMinutes;
          startMinutes + Number(service.duration_minutes) <= openingEndMinutes;
          startMinutes += 30
        ) {
          const startTime = this.combineDateAndTime(
            dateString,
            `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`,
          )
          const endTime = new Date(startTime)
          endTime.setMinutes(endTime.getMinutes() + Number(service.duration_minutes))

          const hasConflict = appointments.some((appointment) =>
            this.overlaps(startTime, endTime, appointment.start_time, appointment.end_time),
          )

          if (hasConflict) continue

          slots.push({
            employeeId: employee.id,
            employeeName: employee.name,
            serviceId: service.id,
            serviceName: service.name,
            startTime,
            endTime,
            dateString,
            timeString: `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`,
          })
        }
      }
    }

    const sortedSlots = slots
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || a.employeeName.localeCompare(b.employeeName))

    if (typeof limit === "number") {
      return sortedSlots.slice(0, limit)
    }

    return sortedSlots
  }

  async getNextAvailableSlots({ companyId, serviceId, fromDateString, daysToScan = 14, limit = 3, employeeId = null }) {
    const slots = []
    const cursor = new Date(`${fromDateString}T12:00:00-03:00`)

    for (let offset = 0; offset < daysToScan; offset++) {
      const dateString = this.toDateString(cursor)
      const daySlots = await this.getAvailableSlots({
        companyId,
        serviceId,
        dateString,
        limit,
        employeeId,
      })

      daySlots.forEach((slot) => slots.push(slot))

      if (slots.length >= limit) {
        return slots.slice(0, limit)
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    return slots
  }

  findBestExactSlot(slots = [], requestedTime) {
    return slots.find((slot) => slot.timeString === requestedTime) || null
  }

  timeStringToMinutes(timeString = "") {
    const [hour, minute] = String(timeString).split(":").map(Number)

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null

    return hour * 60 + minute
  }

  isSlotInPeriod(slot, periodKey) {
    const minutes = this.timeStringToMinutes(slot?.timeString || "")
    if (minutes === null || !periodKey) return true

    if (periodKey === "morning") return minutes >= 5 * 60 && minutes < 12 * 60
    if (periodKey === "afternoon") return minutes >= 12 * 60 && minutes < 18 * 60
    if (periodKey === "evening") return minutes >= 18 * 60 && minutes < 23 * 60

    return true
  }

  filterSlotsByPeriod(slots = [], periodKey = null) {
    if (!periodKey) return slots
    return slots.filter((slot) => this.isSlotInPeriod(slot, periodKey))
  }

  findNearestSlots(slots = [], requestedTime, limit = 3) {
    const requestedMinutes = this.timeStringToMinutes(requestedTime)

    if (requestedMinutes === null) return slots.slice(0, limit)

    return slots
      .slice()
      .sort((a, b) => {
        const distanceA = Math.abs(this.timeStringToMinutes(a.timeString) - requestedMinutes)
        const distanceB = Math.abs(this.timeStringToMinutes(b.timeString) - requestedMinutes)

        return distanceA - distanceB || a.startTime.getTime() - b.startTime.getTime()
      })
      .slice(0, limit)
  }

  buildServiceOptionsReply(customerName, services = []) {
    if (services.length === 0) {
      return this.buildNoServicesConfiguredReply(customerName)
    }

    const options = services
      .slice(0, 5)
      .map((service, index) => {
        const duration = service.duration_minutes ? `${service.duration_minutes} min` : "duração não informada"
        return `${index + 1}. ${service.name} - R$ ${formatCurrency(service.price)} - ${duration}`
      })
      .join("\n")

    return [
      `Oi, ${firstName(customerName)}! 😊 Que bom falar com você.`,
      "Vou adorar te ajudar com o seu agendamento ✨",
      "Me diga qual serviço você quer agendar. Se preferir, pode responder com o número:",
      options,
    ].join("\n\n")
  }

  buildAskDateReply(customerName, service) {
    return [
      "Perfeito! ✨",
      `Vamos agendar ${service.name}. Qual dia você prefere?`,
      "Pode me responder, por exemplo: hoje, amanhã, sexta ou 18/05.",
    ].join("\n\n")
  }

  buildAskDateWithProfessionalReply(customerName, service, professional) {
    return [
      "Perfeito! ✨",
      `Vamos agendar ${service.name} com ${professionalReference(professional.name)}. Qual dia você prefere?`,
      "Pode me responder, por exemplo: hoje, amanhã, sexta ou 18/05.",
    ].join("\n\n")
  }

  buildAskServiceWithProfessionalReply(customerName, professional, services = []) {
    if (services.length === 0) {
      return this.buildNoServicesForProfessionalReply(customerName, professional)
    }

    const options = services
      .slice(0, 5)
      .map((service, index) => `${index + 1}. ${service.name} - R$ ${formatCurrency(service.price)}`)
      .join("\n")

    return [
      "Perfeito! 😊",
      `Vou verificar um agendamento com ${professionalReference(professional.name)}. Qual serviço você quer fazer?`,
      options
        ? `Estas são algumas opções:\n${options}`
        : "Me diga qual serviço você deseja, que eu continuo por aqui ✨",
    ].join("\n\n")
  }

  buildAskTimeReply(customerName, service, dateString, slots = [], professional = null) {
    const options = slots
      .slice(0, 4)
      .map((slot, index) => `${index + 1}. ${slot.timeString} com ${professionalReference(slot.employeeName)}`)
      .join("\n")

    const intro = professional
      ? `Tenho estes horários com ${professionalReference(professional.name)} para ${service.name} no dia ${formatDateLabel(`${dateString}T12:00:00-03:00`)} 💛`
      : `Tenho estes horários para ${service.name} no dia ${formatDateLabel(`${dateString}T12:00:00-03:00`)} 💛`

    return [
      intro,
      "Lembre que estes horários são apenas sugestões 😊",
      options,
      "Lembre que estes horários são apenas sugestões.",
      "Se quiser agendar em outro horário, é só me informar que eu verifico a disponibilidade para você ✨",
    ].join("\n\n")
  }

  buildNoAvailabilityReply(customerName, service, slots = []) {
    if (slots.length === 0) {
      return [
        `No momento, eu não encontrei agenda livre para ${service.name} nos próximos dias 😥`,
        "Mas eu posso tentar outro serviço ou, se preferir, você pode me dizer outro período 💬",
      ].join("\n\n")
    }

    const options = slots
      .map((slot, index) =>
        `${index + 1}. ${formatDateLabel(slot.startTime)} às ${formatTimeLabel(slot.startTime)} com ${professionalReference(slot.employeeName)}`,
      )
      .join("\n")

    return [
      "Entendi. Esse horário não está livre, mas encontrei estas opções próximas 😊",
      options,
      "Se alguma te atender, me responda com o número da opção.",
    ].join("\n\n")
  }

  buildNoServicesConfiguredReply(customerName) {
    return [
      `Oi, ${firstName(customerName)}! 😊`,
      "No momento, ainda não encontrei serviços disponíveis para agendamento por aqui.",
      "Se preferir, posso te ajudar depois que a equipe atualizar o cadastro 💛",
    ].join("\n\n")
  }

  buildNoProfessionalsConfiguredReply(customerName) {
    return [
      `Oi, ${firstName(customerName)}! 😊`,
      "No momento, ainda não encontrei profissionais disponíveis para realizar agendamentos por aqui.",
      "Se quiser, você pode tentar novamente mais tarde ou falar com a equipe da empresa 💛",
    ].join("\n\n")
  }

  buildNoServicesForProfessionalReply(customerName, professional) {
    return [
      "Entendi 😊",
      `No momento, ${professionalReference(professional.name)} ainda não está vinculado(a) a serviços disponíveis para agendamento por aqui.`,
      "Se quiser, posso verificar outra profissional ou te ajudar quando a equipe atualizar isso 💛",
    ].join("\n\n")
  }

  buildNoProfessionalsForServiceReply(customerName, service) {
    return [
      "Entendi 😊",
      `No momento, ${service.name} está sem profissionais disponíveis para atendimento por aqui.`,
      "Se quiser, posso tentar outro serviço ou você pode falar com a equipe para conferir novas opções 💛",
    ].join("\n\n")
  }

  buildRequestedTimeUnavailableReply(customerName, service, requestedTime, slots = []) {
    if (slots.length === 0) {
      return [
        `Não encontrei disponibilidade às ${requestedTime} para ${service.name} 😥`,
        "Se quiser, me diga outro horário e eu verifico para você 💬",
      ].join("\n\n")
    }

    const options = slots
      .map((slot, index) => `${index + 1}. ${formatTimeLabel(slot.startTime)} com ${professionalReference(slot.employeeName)}`)
      .join("\n")

    return [
      `Às ${requestedTime} não está disponível para ${service.name}, mas encontrei estas opções próximas 😊`,
      options,
      "Se preferir, também pode me dizer outro horário que eu verifico para você ✨",
    ].join("\n\n")
  }

  formatOpenAppointmentOption(appointment, index = null) {
    const prefix = index !== null ? `${index + 1}. ` : ""
    const statusLabel = appointment.status === "CONFIRMED" ? "confirmado" : "pendente"

    return `${prefix}${appointment.service.name} - ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)} com ${professionalReference(appointment.employee?.name || "")} (${statusLabel})`
  }

  buildOpenAppointmentsReply(customerName, appointments = []) {
    if (appointments.length === 0) {
      return [
        "No momento, não encontrei agendamentos pendentes ou confirmados no seu número 😊",
        "Se quiser, posso te ajudar a marcar um novo horário por aqui ✨",
      ].join("\n\n")
    }

    return [
      `Encontrei estes agendamentos no seu número, ${firstName(customerName)} 😊`,
      appointments
        .map((appointment, index) => this.formatOpenAppointmentOption(appointment, index))
        .join("\n"),
      "Se quiser cancelar ou remarcar algum deles, me diga qual opção você quer.",
    ].join("\n\n")
  }

  buildSelectAppointmentToCancelReply(customerName, appointments = []) {
    return [
      "Claro! Me diga qual agendamento você quer cancelar 😊",
      appointments
        .map((appointment, index) => this.formatOpenAppointmentOption(appointment, index))
        .join("\n"),
      "Pode responder com o número da opção.",
    ].join("\n\n")
  }

  buildCancelConfirmationReply(customerName, appointment) {
    return [
      "Tudo bem.",
      `Você quer cancelar ${appointment.service.name} do dia ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)} com ${professionalReference(appointment.employee?.name || "")}?`,
      "Se estiver certo, me responda com 'sim'.",
    ].join("\n\n")
  }

  buildCancellationSuccessReply(customerName, appointment) {
    return [
      `Prontinho, ${firstName(customerName)}. Seu agendamento foi cancelado.`,
      `${appointment.service.name} do dia ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)} com ${professionalReference(appointment.employee?.name || "")}.`,
      "Se quiser, eu posso te ajudar a marcar outro horário por aqui.",
    ].join("\n\n")
  }

  buildSelectAppointmentToRescheduleReply(customerName, appointments = []) {
    return [
      "Claro! Qual agendamento você quer remarcar? 😊",
      appointments
        .map((appointment, index) => this.formatOpenAppointmentOption(appointment, index))
        .join("\n"),
      "Pode responder com o número da opção.",
    ].join("\n\n")
  }

  buildAskRescheduleDateReply(customerName, appointment) {
    return [
      "Perfeito! Vamos remarcar esse atendimento ✨",
      `Hoje ele está em ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)}.`,
      "Qual novo dia você prefere?",
    ].join("\n\n")
  }

  buildRescheduleConfirmationReply(customerName, slot, previousAppointment) {
    return [
      "Perfeito! Encontrei uma nova opção para você ✨",
      `Saindo de ${formatDateLabel(previousAppointment.start_time)} às ${formatTimeLabel(previousAppointment.start_time)} e indo para ${formatDateLabel(slot.startTime)} às ${formatTimeLabel(slot.startTime)} com ${professionalReference(slot.employeeName)}.`,
      "Se estiver tudo certo, me responda com 'sim' e eu faço a remarcação 💛",
    ].join("\n\n")
  }

  buildRescheduleSuccessReply(customerName, appointment, previousAppointment) {
    return [
      `Prontinho, ${firstName(customerName)}! Seu agendamento foi remarcado 💖`,
      `Antes: ${formatDateLabel(previousAppointment.start_time)} às ${formatTimeLabel(previousAppointment.start_time)}.`,
      `Novo horário: ${appointment.service.name} no dia ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)} com ${professionalReference(appointment.employee?.name || "")}.`,
      "Se precisar ajustar de novo, é só me chamar por aqui.",
    ].join("\n\n")
  }

  buildProfessionalUnavailableForServiceReply(customerName, service, professional, availableProfessionals = []) {
    const options = availableProfessionals
      .slice(0, 4)
      .map((item) => `- ${professionalReference(item.name)}`)
      .join("\n")

    return [
      `No momento, ${professionalReference(professional.name)} não atende ${service.name} 😥`,
      options
        ? `Quem pode te atender nesse serviço é:\n${options}`
        : "No momento, não encontrei outro profissional disponível para esse serviço.",
      "Se quiser, posso seguir o agendamento com uma dessas opções e já te mostrar os horários ✨",
    ].join("\n\n")
  }

  buildConfirmationReply(customerName, slot) {
    return [
      "Perfeito! Encontrei um horário para você ✨",
      `${slot.serviceName} no dia ${formatDateLabel(slot.startTime)} às ${formatTimeLabel(slot.startTime)} com ${professionalReference(slot.employeeName)}.`,
      "Se estiver tudo certinho, me responda com 'sim' e eu confirmo o agendamento 💛",
    ].join("\n\n")
  }

  buildSuccessReply(customerName, appointment, professionalName = "") {
    const assignedProfessionalName = professionalName || appointment?.employee?.name || ""

    return [
      `Prontinho, ${firstName(customerName)}! Seu agendamento foi confirmado 💖`,
      `${appointment.service.name} no dia ${formatDateLabel(appointment.start_time)} às ${formatTimeLabel(appointment.start_time)}${assignedProfessionalName ? ` com ${professionalReference(assignedProfessionalName)}` : ""}.`,
      assignedProfessionalName ? `${professionalReference(assignedProfessionalName)} ficará responsável pelo seu atendimento ✨` : "",
      "Se precisar ajustar depois, me chama por aqui que eu te ajudo.",
    ].filter(Boolean).join("\n\n")
  }

  buildRestartReply(customerName) {
    return [
      "Sem problema 😊",
      "Podemos tentar outro horário. Me diga novamente o serviço e o dia que você prefere.",
    ].join("\n\n")
  }

  buildOutOfScopeReply(customerName, companyProfile) {
    return [
      `Oi, ${firstName(customerName)}!`,
      "A finalidade deste chat é te ajudar com agendamentos por aqui.",
      "Se quiser marcar um horário, remarcar ou cancelar, é só me chamar 😊",
    ]
      .join("\n\n")
  }

  buildNoSchedulingReply(customerName) {
    return [
      "Tudo bem 😊",
      "Fico à disposição por aqui.",
      "Quando quiser realizar seu agendamento, é só me chamar 💛",
    ].join("\n\n")
  }

  buildPaymentMethodsReply(customerName, companyProfile) {
    const methods = companyProfile?.accepted_payment_methods?.length
      ? companyProfile.accepted_payment_methods.join(", ")
      : null

    return [
      "Claro! 😊",
      methods
        ? `No momento, trabalhamos com estas formas de pagamento: ${methods}.`
        : "No momento, ainda não tenho as formas de pagamento cadastradas por aqui.",
      "Se quiser, seguimos com o seu agendamento por aqui ✨",
    ].join("\n\n")
  }

  buildAmenitiesReply(customerName, companyProfile) {
    const amenities = companyProfile?.amenities?.length
      ? companyProfile.amenities.join(", ")
      : null

    return [
      "Claro! 😊",
      amenities
        ? `Nosso espaço conta com: ${amenities}.`
        : "No momento, ainda não tenho as comodidades cadastradas por aqui.",
      "Se quiser, eu também posso continuar te ajudando com o seu agendamento 💛",
    ].join("\n\n")
  }

  buildRestartFlowReply(customerName, services = []) {
    return [
      "Tudo bem! Vamos recomeçar com calma 😊",
      this.buildServiceOptionsReply(customerName, services),
    ].join("\n\n")
  }

  buildGreetingFlowReply(customerName, services = []) {
    return this.buildServiceOptionsReply(customerName, services)
  }

  buildServiceChangeReply(customerName, services = []) {
    return [
      "Sem problema! Vamos trocar o serviço ✨",
      "Me diga qual serviço você quer agora. Se preferir, pode responder com o número:",
      services
        .slice(0, 5)
        .map((service, index) => `${index + 1}. ${service.name} - R$ ${formatCurrency(service.price)}`)
        .join("\n"),
    ].join("\n\n")
  }

  buildServiceDetailsReply(customerName, service, professionals = []) {
    const duration = service.duration_minutes ? `${service.duration_minutes} min` : "duração não informada"
    const price = service.price !== undefined && service.price !== null
      ? `R$ ${formatCurrency(service.price)}`
      : "valor não informado"
    const professionalsLabel = professionals.length > 0
      ? professionals.slice(0, 4).map((item) => item.name).join(", ")
      : null

    return [
      "Claro! 😊",
      `${service.name}: ${price} • ${duration}.${service.description ? ` ${service.description}` : ""}`,
      professionalsLabel ? `Esse serviço pode ser feito com: ${professionalsLabel.split(", ").map((name) => professionalReference(name)).join(", ")}.` : "",
      "Se quiser, eu também posso verificar os horários para você ✨",
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  buildProfessionalDetailsReply(customerName, professional, services = []) {
    const servicesLabel = services.length > 0
      ? services.slice(0, 5).map((service) => `- ${service.name}`).join("\n")
      : null

    return [
      "Claro! 😊",
      `${professionalReference(professional.name)}${professional.role ? ` atua como ${professional.role}` : ""}.`,
      servicesLabel ? `${professionalReference(professional.name)} pode te atender nestes serviços:\n${servicesLabel}` : "No momento, não encontrei os serviços vinculados a essa profissional por aqui.",
      "Se quiser, posso verificar um horário com ela para você 💛",
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  buildProfessionalScheduleReply(customerName, professional, openings = [], dateString = null) {
    if (openings.length === 0) {
      return [
        "Claro! 😊",
        dateString
          ? `No momento, não encontrei horários cadastrados para ${professionalReference(professional.name)} nesse dia.`
          : `No momento, não encontrei horários cadastrados para ${professionalReference(professional.name)}.`,
        "Se quiser, posso verificar outra data ou outro profissional para você ✨",
      ].join("\n\n")
    }

    const grouped = new Map()

    openings.forEach((opening) => {
      const key = opening.week_day
      const label = formatWeekDayLabel(key)
      const start = formatTimeLabel(opening.start_time)
      const end = formatTimeLabel(opening.end_time)
      const current = grouped.get(label) || []
      current.push(`${start} às ${end}`)
      grouped.set(label, current)
    })

    const scheduleLines = [...grouped.entries()]
      .map(([label, ranges]) => `${label}: ${ranges.join(" | ")}`)
      .join("\n")

    return [
      "Claro! 😊",
      dateString
        ? `Estes são os horários cadastrados para ${professionalReference(professional.name)} no dia ${formatDateLabel(`${dateString}T12:00:00-03:00`)}:`
        : `Estes são os horários cadastrados para ${professionalReference(professional.name)}:`,
      scheduleLines,
      "Se quiser, eu também posso verificar um horário específico para você 💛",
    ].join("\n\n")
  }

  buildStructuredReply(action, data = {}, options = {}) {
    const {
      fallbackText = "",
      interactionType = "APPOINTMENT",
      interactionStatus = "IN_PROGRESS",
      conversationState = null,
      additionalInteractionData = {},
    } = options

    return {
      handled: true,
      responseAction: action,
      responseData: data,
      ...(fallbackText ? { replyText: fallbackText } : {}),
      interactionType,
      interactionStatus,
      interactionData: {
        ...(conversationState ? { conversationState } : {}),
        ...additionalInteractionData,
      },
    }
  }

  buildStatePayload(overrides = {}) {
    return {
      phase: overrides.phase || "idle",
      serviceId: overrides.serviceId || null,
      dateString: overrides.dateString || null,
      timeString: overrides.timeString || null,
      employeeId: overrides.employeeId || null,
      employeeName: overrides.employeeName || null,
      periodKey: overrides.periodKey || null,
      periodLabel: overrides.periodLabel || null,
      slotOptions: overrides.slotOptions || [],
      serviceOptions: overrides.serviceOptions || [],
      selectedSlot: overrides.selectedSlot || null,
      appointmentOptions: overrides.appointmentOptions || [],
      targetAppointment: overrides.targetAppointment || null,
      rescheduleAppointmentId: overrides.rescheduleAppointmentId || null,
    }
  }

  async getOpenAppointmentsForCustomer(companyId, customerId) {
    return this.appointmentService.findOpenAppointmentsByCustomer(companyId, customerId)
  }

  async confirmAppointment({ company, customer, state }) {
    if (!state?.selectedSlot?.serviceId || !state?.selectedSlot?.employeeId || !state?.selectedSlot?.startTime) {
      throw new Error("Nao encontrei os dados necessarios para confirmar esse agendamento.")
    }

    const appointment = await this.appointmentService.create({
      company_id: company.id,
      service_id: state.selectedSlot.serviceId,
      employee_id: state.selectedSlot.employeeId,
      client_id: customer.id,
      start_time: state.selectedSlot.startTime,
      status: "CONFIRMED",
      observations: "Agendamento criado via conversa no WhatsApp",
    })

    return appointment
  }

  async cancelAppointment({ state }) {
    if (!state?.targetAppointment?.id) {
      throw new Error("Nao encontrei o agendamento que deveria ser cancelado.")
    }

    return this.appointmentService.cancelAppointment(
      state.targetAppointment.id,
      {
        cancel_reason: "OTHER",
        observations: "Agendamento cancelado via conversa no WhatsApp",
      },
    )
  }

  async rescheduleAppointment({ state }) {
    if (!state?.rescheduleAppointmentId || !state?.selectedSlot?.startTime || !state?.selectedSlot?.employeeId) {
      throw new Error("Nao encontrei os dados necessarios para remarcar esse agendamento.")
    }

    return this.appointmentService.rescheduleAppointment(
      state.rescheduleAppointmentId,
      {
        start_time: state.selectedSlot.startTime,
        employee_id: state.selectedSlot.employeeId,
        service_id: state.selectedSlot.serviceId,
        observations: "Agendamento remarcado via conversa no WhatsApp",
      },
    )
  }

  async handleMessage({
    company,
    companyProfile,
    customer,
    customerMessage,
    latestInteraction,
    messageInterpretation = null,
  }) {
    const previousState = this.getConversationState(latestInteraction)
    const serviceOptions = companyProfile.services
      .slice()
      .sort((a, b) => Number(a.price) - Number(b.price) || a.name.localeCompare(b.name))
    const interpretationConfidence = Number(messageInterpretation?.confidence || 0)
    const interpretedMessage =
      interpretationConfidence >= 0.45 && messageInterpretation?.normalizedMessage
        ? messageInterpretation.normalizedMessage
        : ""
    const interpretedDateReference =
      interpretationConfidence >= 0.45 ? messageInterpretation?.dateReference || "" : ""
    const interpretedTimeReference =
      interpretationConfidence >= 0.45 ? messageInterpretation?.timeReference || "" : ""
    const interpretedPeriodReference =
      interpretationConfidence >= 0.45 ? messageInterpretation?.periodReference || "" : ""
    const messageText = uniqueNonEmptyStrings([
      customerMessage,
      interpretedMessage,
      interpretedDateReference,
      interpretedTimeReference,
      interpretedPeriodReference,
    ]).join(" ")
    const continuingConversation = previousState && previousState.phase && previousState.phase !== "completed"
    const interpretedIntent = messageInterpretation?.intentCategory || "unknown"
    const schedulingIntent =
      continuingConversation ||
      interpretedIntent === "scheduling" ||
      this.isSchedulingIntent(messageText)
    const currentService = this.getSelectedServiceFromState(previousState, serviceOptions)
    const currentProfessional = this.getSelectedProfessionalFromState(previousState, companyProfile.professionals || [])
    const interpretedProfessional =
      interpretationConfidence >= 0.55
        ? this.findProfessionalByHint(messageInterpretation?.professionalName, companyProfile.professionals || [])
        : null
    const professionalCandidates = this.getProfessionalCandidates(messageText, companyProfile.professionals || [])
    const explicitProfessionalFromMessage = professionalCandidates.length === 1
      ? professionalCandidates[0].professional
      : null
    const interpretedService =
      interpretationConfidence >= 0.55
        ? this.findServiceByHint(messageInterpretation?.serviceName, serviceOptions)
        : null
    const serviceCandidatesFromMessage = this.getServiceCandidates(messageText, serviceOptions)
    const explicitServiceFromMessage = serviceCandidatesFromMessage.length === 1
      ? serviceCandidatesFromMessage[0].service
      : null
    const serviceOptionFromState =
      previousState?.phase === "awaiting_service"
        ? previousState?.serviceOptions?.[
            this.extractOptionIndex(messageText, previousState?.serviceOptions?.length || 0)
          ] || null
        : null
    const selectedProfessionalFromMessage = interpretedProfessional || explicitProfessionalFromMessage || currentProfessional
    const selectedServiceFromMessage =
      interpretedService ||
      explicitServiceFromMessage ||
      serviceOptionFromState ||
      currentService
    const openAppointments = await this.getOpenAppointmentsForCustomer(company.id, customer.id)

    if (serviceOptions.length === 0) {
      return this.buildStructuredReply(
        "no_services_configured",
        {},
        {
          fallbackText: this.buildNoServicesConfiguredReply(customer.name),
          interactionType: "INQUIRY",
          interactionStatus: "OTHER",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (previousState?.phase === "awaiting_cancel_selection") {
      const appointmentOptionIndex = this.extractOptionIndex(messageText, previousState?.appointmentOptions?.length || 0)
      const selectedAppointment = appointmentOptionIndex !== null
        ? previousState?.appointmentOptions?.[appointmentOptionIndex]
        : null

      if (selectedAppointment) {
        return this.buildStructuredReply(
          "cancel_confirmation",
          { appointment: selectedAppointment },
          {
            fallbackText: this.buildCancelConfirmationReply(customer.name, selectedAppointment),
            interactionType: "CANCELLATION",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_cancel_confirmation",
              targetAppointment: selectedAppointment,
            }),
          },
        )
      }

      return this.buildStructuredReply(
        "select_appointment_to_cancel",
        { appointments: previousState?.appointmentOptions || [] },
        {
          fallbackText: this.buildSelectAppointmentToCancelReply(customer.name, previousState?.appointmentOptions || []),
          interactionType: "CANCELLATION",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_cancel_selection",
            appointmentOptions: previousState?.appointmentOptions || [],
          }),
        },
      )
    }

    if (previousState?.phase === "awaiting_cancel_confirmation") {
      if (interpretedIntent === "affirmative" || this.isAffirmative(messageText)) {
        const canceledAppointment = await this.cancelAppointment({ state: previousState })

        return this.buildStructuredReply(
          "appointment_canceled",
          { appointment: canceledAppointment },
          {
            fallbackText: this.buildCancellationSuccessReply(customer.name, canceledAppointment),
            interactionType: "CANCELLATION",
            interactionStatus: "CANCELED",
            conversationState: this.buildStatePayload({ phase: "completed" }),
            additionalInteractionData: {
              appointmentId: canceledAppointment.id,
              appointmentStatus: canceledAppointment.status,
            },
          },
        )
      }

      if (interpretedIntent === "negative" || this.isNegative(messageText)) {
        return this.buildStructuredReply(
          "cancellation_aborted",
          {},
          {
            fallbackText: "Tudo bem 😊 Mantive seu agendamento como está.",
            interactionType: "CANCELLATION",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({ phase: "idle" }),
          },
        )
      }

      return this.buildStructuredReply(
        "cancel_confirmation",
        { appointment: previousState?.targetAppointment || null },
        {
          fallbackText: previousState?.targetAppointment
            ? this.buildCancelConfirmationReply(customer.name, previousState.targetAppointment)
            : "Se quiser cancelar, me responda com 'sim'. Se preferir manter como está, me diga 'não'.",
          interactionType: "CANCELLATION",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_cancel_confirmation",
            targetAppointment: previousState?.targetAppointment || null,
          }),
        },
      )
    }

    if (previousState?.phase === "awaiting_reschedule_selection") {
      const appointmentOptionIndex = this.extractOptionIndex(messageText, previousState?.appointmentOptions?.length || 0)
      const selectedAppointment = appointmentOptionIndex !== null
        ? previousState?.appointmentOptions?.[appointmentOptionIndex]
        : null

      if (selectedAppointment) {
        return this.buildStructuredReply(
          "ask_reschedule_date",
          { appointment: selectedAppointment },
          {
            fallbackText: this.buildAskRescheduleDateReply(customer.name, selectedAppointment),
            interactionType: "REAPPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_date",
              serviceId: selectedAppointment.service_id,
              employeeId: selectedAppointment.employee_id,
              employeeName: selectedAppointment.employee?.name || null,
              rescheduleAppointmentId: selectedAppointment.id,
              targetAppointment: selectedAppointment,
            }),
          },
        )
      }

      return this.buildStructuredReply(
        "select_appointment_to_reschedule",
        { appointments: previousState?.appointmentOptions || [] },
        {
          fallbackText: this.buildSelectAppointmentToRescheduleReply(customer.name, previousState?.appointmentOptions || []),
          interactionType: "REAPPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_reschedule_selection",
            appointmentOptions: previousState?.appointmentOptions || [],
          }),
        },
      )
    }

    if (interpretedIntent === "greeting" || this.isGreetingIntent(messageText)) {
      return this.buildStructuredReply(
        "greeting_flow",
        { services: serviceOptions.slice(0, 5) },
        {
          fallbackText: this.buildGreetingFlowReply(customer.name, serviceOptions),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_service",
            serviceOptions: serviceOptions.slice(0, 5),
          }),
        },
      )
    }

    if (interpretedIntent === "restart" || this.isRestartIntent(messageText)) {
      return this.buildStructuredReply(
        "restart_flow",
        { services: serviceOptions.slice(0, 5) },
        {
          fallbackText: this.buildRestartFlowReply(customer.name, serviceOptions),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_service",
            serviceOptions: serviceOptions.slice(0, 5),
          }),
        },
      )
    }

    if (interpretedIntent === "no_scheduling" || this.isNoSchedulingIntent(messageText)) {
      return this.buildStructuredReply(
        "no_scheduling",
        {},
        {
          fallbackText: this.buildNoSchedulingReply(customer.name),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (interpretedIntent === "payment" || this.isPaymentIntent(messageText)) {
      return this.buildStructuredReply(
        "payment_info",
        { paymentMethods: companyProfile?.accepted_payment_methods || [] },
        {
          fallbackText: this.buildPaymentMethodsReply(customer.name, companyProfile),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (interpretedIntent === "amenities" || this.isAmenitiesIntent(messageText)) {
      return this.buildStructuredReply(
        "amenities_info",
        { amenities: companyProfile?.amenities || [] },
        {
          fallbackText: this.buildAmenitiesReply(customer.name, companyProfile),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (interpretedIntent === "cancellation" || this.isCancellationIntent(messageText)) {
      if (openAppointments.length === 0) {
        return this.buildStructuredReply(
          "no_open_appointments",
          {},
          {
            fallbackText: this.buildOpenAppointmentsReply(customer.name, openAppointments),
            interactionType: "CANCELLATION",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({ phase: "idle" }),
          },
        )
      }

      if (openAppointments.length === 1) {
        return this.buildStructuredReply(
          "cancel_confirmation",
          { appointment: openAppointments[0] },
          {
            fallbackText: this.buildCancelConfirmationReply(customer.name, openAppointments[0]),
            interactionType: "CANCELLATION",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_cancel_confirmation",
              targetAppointment: openAppointments[0],
            }),
          },
        )
      }

      return this.buildStructuredReply(
        "select_appointment_to_cancel",
        { appointments: openAppointments },
        {
          fallbackText: this.buildSelectAppointmentToCancelReply(customer.name, openAppointments),
          interactionType: "CANCELLATION",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_cancel_selection",
            appointmentOptions: openAppointments,
          }),
        },
      )
    }

    if (interpretedIntent === "reschedule" || this.isRescheduleIntent(messageText)) {
      if (openAppointments.length === 0) {
        return this.buildStructuredReply(
          "no_open_appointments",
          {},
          {
            fallbackText: this.buildOpenAppointmentsReply(customer.name, openAppointments),
            interactionType: "REAPPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({ phase: "idle" }),
          },
        )
      }

      if (openAppointments.length === 1) {
        return this.buildStructuredReply(
          "ask_reschedule_date",
          { appointment: openAppointments[0] },
          {
            fallbackText: this.buildAskRescheduleDateReply(customer.name, openAppointments[0]),
            interactionType: "REAPPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_date",
              serviceId: openAppointments[0].service_id,
              employeeId: openAppointments[0].employee_id,
              employeeName: openAppointments[0].employee?.name || null,
              rescheduleAppointmentId: openAppointments[0].id,
              targetAppointment: openAppointments[0],
            }),
          },
        )
      }

      return this.buildStructuredReply(
        "select_appointment_to_reschedule",
        { appointments: openAppointments },
        {
          fallbackText: this.buildSelectAppointmentToRescheduleReply(customer.name, openAppointments),
          interactionType: "REAPPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_reschedule_selection",
            appointmentOptions: openAppointments,
          }),
        },
      )
    }

    if (interpretedIntent === "appointment_lookup" || this.isAppointmentLookupIntent(messageText)) {
      return this.buildStructuredReply(
        "open_appointments",
        { appointments: openAppointments },
        {
          fallbackText: this.buildOpenAppointmentsReply(customer.name, openAppointments),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (selectedProfessionalFromMessage && !selectedServiceFromMessage && schedulingIntent) {
      const professionalServices = await this.getServicesForProfessional(company.id, selectedProfessionalFromMessage.id)

      if (professionalServices.length === 0) {
        return this.buildStructuredReply(
          "no_services_for_professional",
          {
            professionalName: selectedProfessionalFromMessage.name,
          },
          {
            fallbackText: this.buildNoServicesForProfessionalReply(
              customer.name,
              selectedProfessionalFromMessage,
            ),
            interactionType: "INQUIRY",
            interactionStatus: "OTHER",
            conversationState: this.buildStatePayload({ phase: "idle" }),
          },
        )
      }

      return this.buildStructuredReply(
        "ask_service_with_professional",
        {
          professionalName: selectedProfessionalFromMessage.name,
          services: professionalServices.slice(0, 5),
        },
        {
          fallbackText: this.buildAskServiceWithProfessionalReply(
            customer.name,
            selectedProfessionalFromMessage,
            professionalServices,
          ),
          interactionType: "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_service",
            employeeId: selectedProfessionalFromMessage.id,
            employeeName: selectedProfessionalFromMessage.name,
            serviceOptions: professionalServices.slice(0, 5),
          }),
        },
      )
    }

    if (this.wantsToChangeService(messageText, currentService)) {
      return this.buildStructuredReply(
        "change_service",
        { services: serviceOptions.slice(0, 5) },
        {
          fallbackText: this.buildServiceChangeReply(customer.name, serviceOptions),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_service",
            serviceOptions: serviceOptions.slice(0, 5),
          }),
        },
      )
    }

    if (currentService) {
      const serviceCandidates = this.getServiceCandidates(messageText, serviceOptions)
      if (serviceCandidates.length === 1 && serviceCandidates[0].service.id !== currentService.id) {
        const nextService = serviceCandidates[0].service

        return this.buildStructuredReply(
          "ask_date",
          { serviceName: nextService.name },
          {
            fallbackText: this.buildAskDateReply(customer.name, nextService),
            interactionType: "APPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_date",
              serviceId: nextService.id,
            }),
          },
        )
      }
    }

    if (selectedServiceFromMessage && (interpretedIntent === "service_info" || this.isServiceInfoIntent(messageText))) {
      const professionalsResult = await this.getProfessionalsForService(company.id, selectedServiceFromMessage.id)

      return this.buildStructuredReply(
        "service_details",
        {
          service: selectedServiceFromMessage,
          professionals: professionalsResult.employees || [],
        },
        {
          fallbackText: this.buildServiceDetailsReply(
            customer.name,
            selectedServiceFromMessage,
            professionalsResult.employees || [],
          ),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (selectedProfessionalFromMessage && (interpretedIntent === "professional_info" || this.isProfessionalInfoIntent(messageText))) {
      const services = await this.getServicesForProfessional(company.id, selectedProfessionalFromMessage.id)

      return this.buildStructuredReply(
        "professional_details",
        {
          professional: selectedProfessionalFromMessage,
          services,
        },
        {
          fallbackText: this.buildProfessionalDetailsReply(customer.name, selectedProfessionalFromMessage, services),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (selectedProfessionalFromMessage && (interpretedIntent === "professional_schedule" || this.isProfessionalScheduleIntent(messageText))) {
      const requestedDate =
        this.parseDateFromMessage(messageText) ||
        (interpretedDateReference ? this.parseDateFromMessage(interpretedDateReference) : null)
      const requestedServiceForSchedule = selectedServiceFromMessage

      if (requestedDate) {
        if (requestedServiceForSchedule) {
          const availableSlots = await this.getAvailableSlots({
            companyId: company.id,
            serviceId: requestedServiceForSchedule.id,
            dateString: requestedDate,
            employeeId: selectedProfessionalFromMessage.id,
            limit: 4,
          })

          if (availableSlots.length > 0) {
            return this.buildStructuredReply(
              "ask_time",
              {
                serviceName: requestedServiceForSchedule.name,
                professionalName: selectedProfessionalFromMessage.name,
                dateString: requestedDate,
                suggestedSlots: availableSlots,
              },
              {
                fallbackText: this.buildAskTimeReply(
                  customer.name,
                  requestedServiceForSchedule,
                  requestedDate,
                  availableSlots,
                  selectedProfessionalFromMessage,
                ),
                interactionType: "INQUIRY",
                interactionStatus: "IN_PROGRESS",
                conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
              },
            )
          }
        }

        const openings = await this.getEmployeeOpenings(
          company.id,
          selectedProfessionalFromMessage.id,
          new Date(`${requestedDate}T12:00:00-03:00`).getDay(),
        )

        return this.buildStructuredReply(
          "professional_schedule",
          {
            professional: selectedProfessionalFromMessage,
            openings,
            dateString: requestedDate,
          },
          {
            fallbackText: this.buildProfessionalScheduleReply(
              customer.name,
              selectedProfessionalFromMessage,
              openings,
              requestedDate,
            ),
            interactionType: "INQUIRY",
            interactionStatus: "IN_PROGRESS",
            conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
          },
        )
      }

      const openings = await this.getProfessionalWeeklyOpenings(company.id, selectedProfessionalFromMessage.id)

      return this.buildStructuredReply(
        "professional_schedule",
        {
          professional: selectedProfessionalFromMessage,
          openings,
        },
        {
          fallbackText: this.buildProfessionalScheduleReply(customer.name, selectedProfessionalFromMessage, openings),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: previousState || this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (interpretedIntent === "out_of_scope" || !schedulingIntent) {
      return this.buildStructuredReply(
        "out_of_scope",
        {},
        {
          fallbackText: this.buildOutOfScopeReply(customer.name, companyProfile),
          interactionType: "INQUIRY",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if ((companyProfile.professionals || []).length === 0) {
      return this.buildStructuredReply(
        "no_professionals_configured",
        {},
        {
          fallbackText: this.buildNoProfessionalsConfiguredReply(customer.name),
          interactionType: "INQUIRY",
          interactionStatus: "OTHER",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (previousState?.phase === "awaiting_confirmation") {
      if (interpretedIntent === "affirmative" || this.isAffirmative(messageText)) {
        try {
          if (previousState?.rescheduleAppointmentId) {
            const updatedAppointment = await this.rescheduleAppointment({
              state: previousState,
            })

            return this.buildStructuredReply(
              "appointment_rescheduled",
              {
                appointment: updatedAppointment,
                previousAppointment: previousState.targetAppointment,
              },
              {
                fallbackText: this.buildRescheduleSuccessReply(
                  customer.name,
                  updatedAppointment,
                  previousState.targetAppointment,
                ),
                interactionType: "REAPPOINTMENT",
                interactionStatus: "SCHEDULED",
                conversationState: this.buildStatePayload({ phase: "completed" }),
                additionalInteractionData: {
                  appointmentId: updatedAppointment.id,
                  appointmentStartTime: updatedAppointment.start_time,
                  appointmentStatus: updatedAppointment.status,
                  previousAppointmentId: previousState.targetAppointment?.id || null,
                },
              },
            )
          }

          const createdAppointment = await this.confirmAppointment({
            company,
            customer,
            state: previousState,
          })

          return this.buildStructuredReply(
            "appointment_confirmed",
            {
              appointment: createdAppointment,
              professionalName: previousState?.selectedSlot?.employeeName || previousState?.employeeName || createdAppointment?.employee?.name || "",
            },
            {
              fallbackText: this.buildSuccessReply(
                customer.name,
                createdAppointment,
                previousState?.selectedSlot?.employeeName || previousState?.employeeName || "",
              ),
              interactionType: "APPOINTMENT",
              interactionStatus: "SCHEDULED",
              conversationState: this.buildStatePayload({ phase: "completed" }),
              additionalInteractionData: {
                appointmentId: createdAppointment.id,
                appointmentStartTime: createdAppointment.start_time,
                appointmentStatus: createdAppointment.status,
              },
            },
          )
        } catch (error) {
          if (error instanceof AppointmentConflictError) {
            const slots = await this.getNextAvailableSlots({
              companyId: company.id,
              serviceId: previousState.selectedSlot.serviceId,
              fromDateString: previousState.dateString,
            })

            return this.buildStructuredReply(
              "no_availability",
              {
                serviceName: previousState.selectedSlot.serviceName,
                suggestedSlots: slots,
              },
              {
                fallbackText: this.buildNoAvailabilityReply(
                  customer.name,
                  {
                    name: previousState.selectedSlot.serviceName,
                  },
                  slots,
                ),
                interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
                interactionStatus: "IN_PROGRESS",
                conversationState: this.buildStatePayload({
                  phase: "awaiting_time",
                  serviceId: previousState.selectedSlot.serviceId,
                  dateString: previousState.dateString,
                  slotOptions: slots,
                  rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
                  targetAppointment: previousState?.targetAppointment || null,
                }),
              },
            )
          }

          throw error
        }
      }

      if (interpretedIntent === "negative" || this.isNegative(messageText)) {
        return this.buildStructuredReply(
          "restart_appointment",
          { services: serviceOptions.slice(0, 5) },
          {
            fallbackText: previousState?.rescheduleAppointmentId
              ? "Sem problema 😊 Podemos tentar outro horário. Me diga outra data ou horário que eu verifico para você."
              : this.buildRestartReply(customer.name),
            interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: previousState?.rescheduleAppointmentId ? "awaiting_date" : "awaiting_service",
              serviceOptions: previousState?.rescheduleAppointmentId ? [] : serviceOptions.slice(0, 5),
              serviceId: previousState?.serviceId || null,
              employeeId: previousState?.employeeId || null,
              employeeName: previousState?.employeeName || null,
              rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
              targetAppointment: previousState?.targetAppointment || null,
            }),
          },
        )
      }
    }

    let selectedService = this.getSelectedServiceFromState(previousState, serviceOptions) || interpretedService
    let selectedProfessional = this.getSelectedProfessionalFromState(previousState, companyProfile.professionals || []) || interpretedProfessional
    let selectedDate = previousState?.dateString || null
    let selectedTime = previousState?.timeString || null
    const requestedPeriod = this.parsePeriodFromMessage(messageText) || (
      interpretedPeriodReference ? this.parsePeriodFromMessage(interpretedPeriodReference) : null
    ) || (
      previousState?.periodKey
        ? { key: previousState.periodKey, label: previousState.periodLabel || null }
        : null
    )

    if (!selectedProfessional) {
      const professionalCandidates = this.getProfessionalCandidates(messageText, companyProfile.professionals || [])

      if (professionalCandidates.length === 1) {
        selectedProfessional = professionalCandidates[0].professional
      }
    }

    if (!selectedService) {
      const serviceOptionIndex = this.extractOptionIndex(messageText, previousState?.serviceOptions?.length || 0)

      if (serviceOptionIndex !== null && previousState?.serviceOptions?.[serviceOptionIndex]) {
        selectedService = previousState.serviceOptions[serviceOptionIndex]
      } else {
        const candidates = this.getServiceCandidates(messageText, serviceOptions)

        if (candidates.length === 1) {
          selectedService = candidates[0].service
        } else if (candidates.length > 1) {
          const candidateServices = candidates.slice(0, 5).map((item) => item.service)
          return this.buildStructuredReply(
            "service_options",
            { services: candidateServices },
            {
              fallbackText: this.buildServiceOptionsReply(customer.name, candidateServices),
              interactionType: "APPOINTMENT",
              interactionStatus: "IN_PROGRESS",
              conversationState: this.buildStatePayload({
                phase: "awaiting_service",
                serviceOptions: candidateServices,
              }),
            },
          )
        }
      }
    }

    if (!selectedService) {
      return this.buildStructuredReply(
        "service_options",
        { services: serviceOptions.slice(0, 5) },
        {
          fallbackText: this.buildServiceOptionsReply(customer.name, serviceOptions),
          interactionType: "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_service",
            serviceOptions: serviceOptions.slice(0, 5),
          }),
        },
      )
    }

    const serviceProfessionalsResult = await this.getProfessionalsForService(company.id, selectedService.id)
    const serviceProfessionals = serviceProfessionalsResult.employees || []

    if (serviceProfessionals.length === 0) {
      return this.buildStructuredReply(
        "no_professionals_for_service",
        {
          serviceName: selectedService.name,
        },
        {
          fallbackText: this.buildNoProfessionalsForServiceReply(customer.name, selectedService),
          interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
          interactionStatus: "OTHER",
          conversationState: this.buildStatePayload({ phase: "idle" }),
        },
      )
    }

    if (selectedProfessional) {
      const professionalCanPerformService = serviceProfessionals.some(
        (professional) => professional.id === Number(selectedProfessional.id),
      )

      if (!professionalCanPerformService) {
        return this.buildStructuredReply(
          "professional_unavailable_for_service",
          {
            serviceName: selectedService.name,
            requestedProfessionalName: selectedProfessional.name,
            availableProfessionals: serviceProfessionals,
          },
          {
            fallbackText: this.buildProfessionalUnavailableForServiceReply(
              customer.name,
              selectedService,
              selectedProfessional,
              serviceProfessionals,
            ),
            interactionType: "APPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_service",
              serviceId: selectedService.id,
              serviceOptions: serviceOptions.slice(0, 5),
            }),
          },
        )
      }
    }

    selectedDate =
      this.parseDateFromMessage(messageText) ||
      (interpretedDateReference ? this.parseDateFromMessage(interpretedDateReference) : null) ||
      selectedDate

    if (!selectedDate) {
      return this.buildStructuredReply(
        "ask_date",
        {
          serviceName: selectedService.name,
          professionalName: selectedProfessional?.name || null,
        },
        {
          fallbackText: selectedProfessional
            ? this.buildAskDateWithProfessionalReply(customer.name, selectedService, selectedProfessional)
            : this.buildAskDateReply(customer.name, selectedService),
          interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_date",
            serviceId: selectedService.id,
            employeeId: selectedProfessional?.id || null,
            employeeName: selectedProfessional?.name || null,
            periodKey: requestedPeriod?.key || null,
            periodLabel: requestedPeriod?.label || null,
            rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
            targetAppointment: previousState?.targetAppointment || null,
          }),
        },
      )
    }

    const slotOptionIndex = this.extractOptionIndex(messageText, previousState?.slotOptions?.length || 0)
    if (slotOptionIndex !== null && previousState?.slotOptions?.[slotOptionIndex]) {
      const selectedSlot = previousState.slotOptions[slotOptionIndex]

      return this.buildStructuredReply(
        "ask_confirmation",
        { slot: selectedSlot },
        {
          fallbackText: previousState?.rescheduleAppointmentId
            ? this.buildRescheduleConfirmationReply(customer.name, selectedSlot, previousState.targetAppointment)
            : this.buildConfirmationReply(customer.name, selectedSlot),
          interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_confirmation",
            serviceId: selectedService.id,
            dateString: selectedDate,
            timeString: selectedSlot.timeString,
            employeeId: selectedSlot.employeeId,
            employeeName: selectedSlot.employeeName,
            periodKey: requestedPeriod?.key || null,
            periodLabel: requestedPeriod?.label || null,
            selectedSlot,
            rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
            targetAppointment: previousState?.targetAppointment || null,
          }),
        },
      )
    }

    selectedTime =
      this.parseTimeFromMessage(messageText) ||
      (interpretedTimeReference ? this.parseTimeFromMessage(interpretedTimeReference) : null) ||
      selectedTime

    if (!selectedTime) {
      const slots = await this.getAvailableSlots({
        companyId: company.id,
        serviceId: selectedService.id,
        dateString: selectedDate,
        employeeId: selectedProfessional?.id || null,
      })
      const periodSlots = this.filterSlotsByPeriod(slots, requestedPeriod?.key || null)
      const suggestedSlots = periodSlots.length > 0 ? periodSlots : slots

      if (suggestedSlots.length === 0) {
        const nextSlots = await this.getNextAvailableSlots({
          companyId: company.id,
          serviceId: selectedService.id,
          fromDateString: selectedDate,
          employeeId: selectedProfessional?.id || null,
        })

        return this.buildStructuredReply(
          "no_availability",
          {
            serviceName: selectedService.name,
            suggestedSlots: nextSlots,
            requestedPeriod: requestedPeriod?.label || null,
          },
          {
            fallbackText: this.buildNoAvailabilityReply(customer.name, selectedService, nextSlots),
            interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_time",
              serviceId: selectedService.id,
              dateString: selectedDate,
              employeeId: selectedProfessional?.id || null,
              employeeName: selectedProfessional?.name || null,
              periodKey: requestedPeriod?.key || null,
              periodLabel: requestedPeriod?.label || null,
              slotOptions: nextSlots,
              rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
              targetAppointment: previousState?.targetAppointment || null,
            }),
          },
        )
      }

      return this.buildStructuredReply(
        "ask_time",
        {
          serviceName: selectedService.name,
          professionalName: selectedProfessional?.name || null,
          dateString: selectedDate,
          requestedPeriod: requestedPeriod?.label || null,
          suggestedSlots,
        },
        {
          fallbackText: this.buildAskTimeReply(customer.name, selectedService, selectedDate, suggestedSlots, selectedProfessional),
          interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_time",
            serviceId: selectedService.id,
            dateString: selectedDate,
            employeeId: selectedProfessional?.id || null,
            employeeName: selectedProfessional?.name || null,
            periodKey: requestedPeriod?.key || null,
            periodLabel: requestedPeriod?.label || null,
            slotOptions: suggestedSlots,
            rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
            targetAppointment: previousState?.targetAppointment || null,
          }),
        },
      )
    }

    const sameDaySlots = await this.getAvailableSlots({
      companyId: company.id,
      serviceId: selectedService.id,
      dateString: selectedDate,
      limit: null,
      employeeId: selectedProfessional?.id || null,
    })
    const exactSlot = this.findBestExactSlot(sameDaySlots, selectedTime)

    if (!exactSlot) {
      const nearestSlots = this.findNearestSlots(sameDaySlots, selectedTime)

      if (nearestSlots.length > 0) {
        return this.buildStructuredReply(
          "requested_time_unavailable",
          {
            serviceName: selectedService.name,
            requestedTime: selectedTime,
            suggestedSlots: nearestSlots,
          },
          {
            fallbackText: this.buildRequestedTimeUnavailableReply(customer.name, selectedService, selectedTime, nearestSlots),
            interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
            interactionStatus: "IN_PROGRESS",
            conversationState: this.buildStatePayload({
              phase: "awaiting_time",
              serviceId: selectedService.id,
              dateString: selectedDate,
              periodKey: requestedPeriod?.key || null,
              periodLabel: requestedPeriod?.label || null,
              slotOptions: nearestSlots,
              rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
              targetAppointment: previousState?.targetAppointment || null,
            }),
          },
        )
      }

      const nextSlots = await this.getNextAvailableSlots({
        companyId: company.id,
        serviceId: selectedService.id,
        fromDateString: selectedDate,
        employeeId: selectedProfessional?.id || null,
      })

      return this.buildStructuredReply(
        "no_availability",
        {
          serviceName: selectedService.name,
          suggestedSlots: nextSlots,
          requestedPeriod: requestedPeriod?.label || null,
        },
        {
          fallbackText: this.buildNoAvailabilityReply(customer.name, selectedService, nextSlots),
          interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
          interactionStatus: "IN_PROGRESS",
          conversationState: this.buildStatePayload({
            phase: "awaiting_time",
            serviceId: selectedService.id,
            dateString: selectedDate,
            employeeId: selectedProfessional?.id || null,
            employeeName: selectedProfessional?.name || null,
            periodKey: requestedPeriod?.key || null,
            periodLabel: requestedPeriod?.label || null,
            slotOptions: nextSlots,
            rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
            targetAppointment: previousState?.targetAppointment || null,
          }),
        },
      )
    }

    return this.buildStructuredReply(
      "ask_confirmation",
      { slot: exactSlot },
      {
        fallbackText: previousState?.rescheduleAppointmentId
          ? this.buildRescheduleConfirmationReply(customer.name, exactSlot, previousState.targetAppointment)
          : this.buildConfirmationReply(customer.name, exactSlot),
        interactionType: previousState?.rescheduleAppointmentId ? "REAPPOINTMENT" : "APPOINTMENT",
        interactionStatus: "IN_PROGRESS",
        conversationState: this.buildStatePayload({
          phase: "awaiting_confirmation",
          serviceId: selectedService.id,
          dateString: selectedDate,
          timeString: exactSlot.timeString,
          employeeId: exactSlot.employeeId,
          employeeName: exactSlot.employeeName,
          periodKey: requestedPeriod?.key || null,
          periodLabel: requestedPeriod?.label || null,
          selectedSlot: exactSlot,
          rescheduleAppointmentId: previousState?.rescheduleAppointmentId || null,
          targetAppointment: previousState?.targetAppointment || null,
        }),
      },
    )
  }
}
