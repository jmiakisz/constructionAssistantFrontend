import { useState } from 'react'

type ParamType = 'model' | 'int' | 'float' | 'text'

interface Param {
  label: string
  value: string | number
  type: ParamType
  desc: string
}

interface Prompt {
  label: string
  desc: string
  value: string
  variables?: string[]
}

interface Section {
  id: string
  label: string
  icon: React.ReactNode
  params: Param[]
  prompts: Prompt[]
}

const CHAT_SYSTEM_PROMPT = `Jesteś asystentem budowlanym projektu "{projectName}".
Rozmawiasz z użytkownikiem o roli: {userRole}, imię: {userName}.
{styleSection}
Odpowiadasz po polsku, konkretnie i na temat projektu.

CZYM JESTEŚ I CZYM NIE JESTEŚ:
Jesteś asystentem tekstowym — możesz rozmawiać, odpowiadać na pytania, analizować informacje i zapamiętywać fakty z rozmów.
NIE możesz: wysyłać maili, generować plików PDF/Word/Excel, wrzucać dokumentów do portalu, dzwonić, wykonywać żadnych działań poza rozmową.
Gdy użytkownik prosi Cię o coś czego NIE możesz zrobić — powiedz wprost że tego nie potrafisz i zaproponuj co możesz zrobić zamiast tego (np. podyktować treść, zapisać ustalenie w rozmowie, przekazać pytanie do admina).
Nigdy nie udawaj że coś zrobiłeś jeśli tego nie zrobiłeś. Nie potwierdzaj akcji których nie wykonałeś.

WAŻNE: Odpowiedź zwróć WYŁĄCZNIE jako JSON bez markdown:
{"response": "twoja odpowiedź", "valuable": true/false, "escalate": false, "category": null, "style_observation": null, "notify_admin": false, "admin_question": null}
valuable=true gdy KTÓRAKOLWIEK strona podaje konkretny fakt: cena, kwota, data, termin, nazwa firmy/podwykonawcy/materiału, decyzja, ustalenie, postęp robót (co zostało zrobione/odebrane/dostarczone), problem techniczny, ryzyko, dane z dokumentów, kto co zrobił/powie/sprawdzi.
valuable=false TYLKO gdy: samo powitanie/pożegnanie/podziękowanie, prośba o doprecyzowanie BEZ podania faktów, odpowiedź 'rozumiem'/'ok' BEZ żadnych konkretnych informacji.
Wątpliwość → valuable=true. Lepiej zapisać za dużo niż za mało.
escalate=true gdy pytanie wymaga głębokiej analizy prawnej, finansowej lub porównania wielu dokumentów — wtedy NIE odpowiadaj, zwróć TYLKO {"response": "", "valuable": false, "escalate": true, "category": null, "style_observation": null, "notify_admin": false, "admin_question": null}.
category (gdy valuable=true): TECHNICZNA | FINANSOWA | PODWYKONAWCY | MATERIALY | null.
style_observation: jedno zdanie o stylu komunikacji usera w tej wiadomości. null gdy brak danych.
notify_admin=true TYLKO gdy user JAWNIE prosi o przekazanie pytania/informacji do zarządzającego/admina/kierownika/managementu. Nie ustawiaj gdy user sam pyta asystenta.
admin_question (gdy notify_admin=true): zwięzła treść pytania/informacji do przekazania zarządzającemu, w imieniu użytkownika.`

const HAIKU_DEDUP_PROMPT = `Projekt: {projectName}
Przeanalizuj rozmowy i sprawdź czy zawierają nową wiedzę której nie ma w bazie.

ISTNIEJĄCA WIEDZA FIRMOWA:
{existingKnowledge}

NOWE ROZMOWY:
{conversations}

Zwróć JSON:
{
  "has_new_knowledge": true/false,
  "new_insights": ["insight1", "insight2"]
}`

const SONNET_CLASSIFICATION_PROMPT = `Projekt: {projectName}
Wyodrębnij i sklasyfikuj wiedzę z rozmów. Weryfikuj każdy fakt z ORYGINALNĄ ROZMOWĄ — nie ufaj ślepo wstępnym wnioskom, mogą być błędne.

AKTUALNA PAMIĘĆ PROJEKTU:
{currentProjectMemory}

WSTĘPNE WNIOSKI (do weryfikacji):
{newInsights}

ORYGINALNA ROZMOWA (źródło prawdy):
{conversations}

Zwróć JSON:
{
  "knowledge_entries": [
    {
      "content": "max 500 znaków, dokładny fakt przepisany z rozmowy",
      "category": "TECHNICZNA|FINANSOWA|PODWYKONAWCY|MATERIALY",
      "type": "PERMANENT|TEMPORAL",
      "valid_until": "2026-07-01T00:00:00" lub null,
      "project_specific": true
    }
  ]
}

Zasady:
- ZAWSZE weryfikuj daty, godziny, kwoty i nazwy z oryginalną rozmową
- Rozróżniaj godzinę (np. "13:00", "godzina 13") od dnia miesiąca ("13-ty", "13 czerwca")
- type=TEMPORAL gdy wiedza dotyczy konkretnej daty/terminu (ustaw valid_until)
- type=PERMANENT dla wzorców, cech, reguł ogólnych
- project_specific=true dla ustaleń tej konkretnej budowy, false dla wiedzy ogólnofirmowej
- Daty absolutne, nigdy względne ("za 3 dni" → konkretna data)`

const STYLE_HAIKU_PROMPT = `Poniżej obserwacje stylu komunikacji użytkownika. Odrzuć jednorazowe anomalie i szum.
Zostaw tylko powtarzające się cechy. Zwróć JSON:
{"meaningful_observations": ["obserwacja1", "obserwacja2"]}

OBSERWACJE:
{obsList}`

const STYLE_SONNET_PROMPT = `Na podstawie obserwacji stwórz spójny profil komunikacyjny użytkownika {userName}.
Zwróć JSON:
{"communication_style": "opis stylu (1-2 zdania)", "formality_level": "FORMAL|NEUTRAL|CASUAL"}

OBSERWACJE:
{observations}`

const DOC_ANALYSIS_PROMPT = `Przeanalizuj poniższy dokument typu {documentType}.

Format odpowiedzi:
{
  "extracted_data": {
    // dowolne klucze i wartości które faktycznie występują w dokumencie
    // np. "wartosc_netto": "1234.56 PLN", "termin_platnosci": "2026-07-01", "strony": ["Firma A", "Firma B"]
    // nie wymyślaj pól których nie ma - wyciągaj tylko to co realnie jest w dokumencie
  },
  "wewnetrzne_niespojnosci": [
    "opis niespójności jeśli istnieje"
  ],
  "ryzyka": [
    "opis ryzyka jeśli istnieje"
  ]
}

DOKUMENT:
{text}`

const CROSS_ANALYSIS_PROMPT = `Przeanalizuj dane wyciągnięte z dokumentów projektu. Znajdź niespójności i ryzyka między dokumentami.

Format odpowiedzi:
{
  "alerts": [
    {"level": "CRITICAL", "message": "..."},
    {"level": "WARNING", "message": "..."},
    {"level": "INFO", "message": "..."}
  ]
}

Poziomy: CRITICAL (ryzyko finansowe/prawne), WARNING (niespójność), INFO (obserwacja).

DANE Z DOKUMENTÓW:
{extractedDataList}`

const BRIEFING_USER_PROMPT = `Projekt: {projectName}
Rola użytkownika: {roleName}

Poniżej znajdują się ostatnie informacje z projektu. Mogą zawierać dane z różnych obszarów.
Wybierz i uwzględnij tylko to, co jest istotne dla roli {roleName} — pomiń rzeczy nieistotne dla tej roli.

{context}

Napisz zwięzłe podsumowanie (3–5 zdań) aktualnej sytuacji na projekcie z perspektywy roli {roleName}.
Zacznij od razu od treści — bez wstępu ani nagłówka.`

const SECTIONS: Section[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    params: [
      { label: 'Model główny', value: 'claude-haiku-4-5-20251001', type: 'model', desc: 'Model dla większości odpowiedzi w czacie (szybki, tani)' },
      { label: 'Model eskalacji', value: 'claude-sonnet-4-6', type: 'model', desc: 'Model gdy Haiku zwróci escalate=true (głębsza analiza)' },
      { label: 'Historia rozmowy', value: 10, type: 'int', desc: 'Ostatnich N wiadomości dołączanych do każdego requestu' },
      { label: 'Chunki dokumentów (RAG)', value: 5, type: 'int', desc: 'Maks. fragmentów dokumentów wyszukiwanych per zapytanie' },
      { label: 'Wpisy wiedzy (RAG)', value: 5, type: 'int', desc: 'Maks. wpisów z bazy wiedzy wyszukiwanych per zapytanie' },
      { label: 'Próg podobieństwa RAG', value: 0.45, type: 'float', desc: 'Maks. odległość cosinusowa (0=identyczne, 1=zupełnie różne). Zwiększenie = więcej wyników, mniejsza precyzja' },
      { label: 'Próg kompaktowania', value: 50, type: 'int', desc: 'Liczba wiadomości w konwersacji, po której streszczamy starsze' },
      { label: 'Zachowaj po kompaktowaniu', value: 10, type: 'int', desc: 'Liczba ostatnich wiadomości zachowywanych po streszczeniu' },
    ],
    prompts: [
      {
        label: 'System prompt (cacheable)',
        desc: 'Główny prompt wysyłany z każdą wiadomością. Keszowany przez Anthropic przez 5 min (tańszy cache hit). Zawiera instrukcje JSON, definicje valuable/escalate/notify_admin.',
        value: CHAT_SYSTEM_PROMPT,
        variables: ['{projectName}', '{userRole}', '{userName}', '{styleSection}'],
      },
      {
        label: 'Prompt streszczenia konwersacji',
        desc: 'Używany gdy konwersacja przekroczy próg kompaktowania. Streszcza najstarsze wiadomości.',
        value: 'Zrób zwięzłe streszczenie poniższej rozmowy (max 500 słów) zachowując kluczowe fakty, decyzje, ustalenia, nazwy i kwoty. Odpowiedz TYLKO streszczeniem, bez wstępu.',
        variables: [],
      },
    ],
  },
  {
    id: 'nightly',
    label: 'Agent Nocny',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    params: [
      { label: 'Model Haiku (ekstrakcja)', value: 'claude-haiku-4-5-20251001', type: 'model', desc: 'Haiku do wstępnej deduplikacji i filtrowania wiedzy' },
      { label: 'Model Sonnet (klasyfikacja)', value: 'claude-sonnet-4-6', type: 'model', desc: 'Sonnet do finalnej klasyfikacji i zapisu wpisów wiedzy' },
      { label: 'Lookback sync (dni)', value: 30, type: 'int', desc: 'Jak daleko wstecz sięga ekstrakcja w trybie synchronicznym (admin/testy)' },
      { label: 'Lookback batch (dni)', value: 2, type: 'int', desc: 'Jak daleko wstecz sięga ekstrakcja w trybie batch (nocny cron)' },
      { label: 'Limit istniejącej wiedzy', value: 50, type: 'int', desc: 'Maks. wpisów wiedzy wysyłanych do Haiku jako kontekst deduplikacji' },
      { label: 'Lookback stylu (dni)', value: 7, type: 'int', desc: 'Obserwacje stylu z ostatnich N dni brane do konsolidacji' },
      { label: 'Min. obserwacji stylu', value: 3, type: 'int', desc: 'Minimalna liczba obserwacji wymagana do konsolidacji profilu stylu' },
      { label: 'Próg duplikatów (cosine)', value: 0.15, type: 'float', desc: 'Odległość < N → traktowane jako duplikaty. Mniejsza = bardziej agresywne scalanie' },
      { label: 'Degradacja pewności (dni)', value: 60, type: 'int', desc: 'Wpisy niepotwierdzone przez N dni tracą 1 punkt pewności' },
      { label: 'Cleanup obserwacji stylu (dni)', value: 30, type: 'int', desc: 'Obserwacje starsze niż N dni są usuwane' },
    ],
    prompts: [
      {
        label: 'System prompt agenta',
        desc: 'Bazowy system prompt dla wszystkich wywołań agenta nocnego.',
        value: 'Jesteś agentem budowlanym. Odpowiadasz WYŁĄCZNIE poprawnym JSON bez markdown ani backtick.',
        variables: [],
      },
      {
        label: 'Haiku — deduplikacja wiedzy',
        desc: 'Etap 1: Haiku sprawdza czy rozmowy zawierają nową wiedzę nieobecną w bazie. Tańszy model, szybszy filtr.',
        value: HAIKU_DEDUP_PROMPT,
        variables: ['{projectName}', '{existingKnowledge}', '{conversations}'],
      },
      {
        label: 'Sonnet — klasyfikacja i zapis',
        desc: 'Etap 2: Sonnet wyodrębnia i klasyfikuje wiedzę. Uruchamiany tylko gdy Haiku stwierdzi nową wiedzę.',
        value: SONNET_CLASSIFICATION_PROMPT,
        variables: ['{projectName}', '{currentProjectMemory}', '{newInsights}', '{conversations}'],
      },
      {
        label: 'Haiku — styl komunikacji',
        desc: 'Filtruje obserwacje stylu — odrzuca jednorazowe anomalie, zostawia powtarzające się cechy.',
        value: STYLE_HAIKU_PROMPT,
        variables: ['{obsList}'],
      },
      {
        label: 'Sonnet — profil użytkownika',
        desc: 'Tworzy spójny profil komunikacyjny użytkownika na podstawie przefiltrowanych obserwacji.',
        value: STYLE_SONNET_PROMPT,
        variables: ['{userName}', '{observations}'],
      },
    ],
  },
  {
    id: 'docs',
    label: 'Dokumenty',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    params: [
      { label: 'Model analizy dokumentów', value: 'claude-haiku-4-5-20251001', type: 'model', desc: 'Model do analizy treści dokumentów i cross-analizy' },
      { label: 'Rozmiar fragmentu (znaki)', value: 1000, type: 'int', desc: 'Długość pojedynczego chunka dokumentu w znakach' },
      { label: 'Nakładanie fragmentów (znaki)', value: 200, type: 'int', desc: 'Nakładanie sąsiednich chunków — zapobiega utracie kontekstu na granicach' },
      { label: 'Maks. długość tekstu (znaki)', value: 300000, type: 'int', desc: 'Limit znaków wyodrębnionego tekstu z dokumentu (Tika). Dłuższe dokumenty są obcinane.' },
    ],
    prompts: [
      {
        label: 'System prompt analizy',
        desc: 'Bazowy system prompt dla analiz dokumentów.',
        value: 'Jesteś asystentem prawno-budowlanym. Odpowiadasz WYŁĄCZNIE poprawnym JSON bez markdown ani backtick.',
        variables: [],
      },
      {
        label: 'Analiza pojedynczego dokumentu',
        desc: 'Ekstrakcja danych, wewnętrznych niespójności i ryzyk z jednego dokumentu.',
        value: DOC_ANALYSIS_PROMPT,
        variables: ['{documentType}', '{text}'],
      },
      {
        label: 'Cross-analiza dokumentów',
        desc: 'Uruchamiany gdy wszystkie FULL dokumenty projektu są gotowe. Szuka niespójności między dokumentami.',
        value: CROSS_ANALYSIS_PROMPT,
        variables: ['{extractedDataList}'],
      },
    ],
  },
  {
    id: 'briefing',
    label: 'Briefing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    params: [
      { label: 'Model briefingu', value: 'claude-haiku-4-5-20251001', type: 'model', desc: 'Model generujący podsumowania projektu per rola' },
      { label: 'Cache briefingu (godziny)', value: 1, type: 'int', desc: 'Czas ważności wygenerowanego briefingu. Po upływie regenerowany przy następnym wejściu.' },
      { label: 'Wpisy wiedzy (briefing)', value: 20, type: 'int', desc: 'Liczba ostatnich wpisów wiedzy pobieranych do wygenerowania briefingu' },
    ],
    prompts: [
      {
        label: 'System prompt briefingu',
        desc: 'Bazowy system prompt dla generowania briefingów.',
        value: 'Jesteś asystentem budowlanym. Odpowiadasz wyłącznie po polsku. Bądź konkretny i zwięzły.',
        variables: [],
      },
      {
        label: 'Prompt generowania podsumowania',
        desc: 'Generuje podsumowanie sytuacji na projekcie dopasowane do roli użytkownika.',
        value: BRIEFING_USER_PROMPT,
        variables: ['{projectName}', '{roleName}', '{context}'],
      },
    ],
  },
]

const MODEL_COLORS: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'claude-sonnet-4-6': 'bg-blue-50 text-blue-700 border-blue-200',
  'claude-opus-4-8': 'bg-purple-50 text-purple-700 border-purple-200',
}

function ParamCard({ param }: { param: Param }) {
  const isModel = param.type === 'model'
  const modelColor = isModel ? MODEL_COLORS[String(param.value)] ?? 'bg-gray-100 text-gray-700 border-gray-200' : ''

  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{param.label}</p>
      {isModel ? (
        <span className={`inline-flex items-center text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border w-fit ${modelColor}`}>
          {String(param.value)}
        </span>
      ) : (
        <p className="text-xl font-semibold text-gray-900 font-mono">
          {typeof param.value === 'number' ? param.value.toLocaleString('pl-PL') : param.value}
        </p>
      )}
      <p className="text-xs text-gray-400 leading-relaxed">{param.desc}</p>
    </div>
  )
}

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{prompt.label}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{prompt.desc}</p>
            {prompt.variables && prompt.variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {prompt.variables.map(v => (
                  <span key={v} className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700
                         bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg
                         transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Skopiowano
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Kopiuj
                </>
              )}
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700
                         bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {expanded ? 'Zwiń' : 'Rozwiń'}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {!expanded && (
          <p className="text-xs text-gray-400 font-mono mt-3 truncate">
            {prompt.value.replace(/\n/g, ' ').substring(0, 120)}…
          </p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          <textarea
            readOnly
            value={prompt.value}
            rows={Math.min(prompt.value.split('\n').length + 1, 24)}
            className="w-full px-5 py-4 text-xs font-mono text-gray-700 bg-transparent
                       resize-none border-0 outline-none leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}

export default function AiConfigAdmin() {
  const [activeTab, setActiveTab] = useState('chat')

  const section = SECTIONS.find(s => s.id === activeTab)!

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Konfiguracja AI</h1>
          <p className="text-sm text-gray-500 mt-1">Aktualnie obowiązujące parametry i prompty silnika AI</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700
                        text-xs font-medium px-3 py-2 rounded-xl">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Podgląd — edycja w następnym kroku
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer
              ${activeTab === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Params */}
      {section.params.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Parametry numeryczne i modele
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {section.params.map(p => <ParamCard key={p.label} param={p} />)}
          </div>
        </div>
      )}

      {/* Prompts */}
      {section.prompts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Prompty
          </h2>
          <div className="space-y-3">
            {section.prompts.map(p => <PromptCard key={p.label} prompt={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
