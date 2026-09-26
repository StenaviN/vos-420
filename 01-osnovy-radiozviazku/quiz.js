"use strict";

const questionBank = [
  {
    topic: "Керівні документи",
    question: "Який документ названо одним з основних для ведення радіозв'язку у ЗСУ?",
    options: ["Регламент радіозв'язку ЗСУ РР-2018", "Статут внутрішньої служби", "Правила дорожнього руху", "Табель термінових донесень"],
    answer: 0,
    explanation: "У конспекті окремо виділено Регламент радіозв'язку ЗСУ РР-2018 та настанови з організації радіозв'язку."
  },
  {
    topic: "Радіодані",
    question: "Які дані доводять до радіооператора?",
    options: ["Усі дані підрозділу без обмежень", "Лише дані, потрібні для роботи на строк їх дії", "Тільки позивний начальника", "Тільки робочу частоту"],
    answer: 1,
    explanation: "Оператор отримує необхідний мінімум: частоти, позивні, час зміни, вид зв'язку та, за потреби, азимути й ключі."
  },
  {
    topic: "Організація зв'язку",
    question: "Радіонапрямок організовують між...",
    options: ["двома кореспондентами", "трьома кореспондентами", "усіма станціями гарнізону", "лише двома ретрансляторами"],
    answer: 0,
    explanation: "Радіонапрямок - це спосіб організації радіозв'язку між двома кореспондентами."
  },
  {
    topic: "Організація зв'язку",
    question: "Радіомережа об'єднує...",
    options: ["рівно дві станції", "лише станції одного типу", "трьох і більше кореспондентів", "лише чергові приймачі"],
    answer: 2,
    explanation: "Радіомережа призначена для зв'язку між трьома і більше кореспондентами."
  },
  {
    topic: "Організація зв'язку",
    question: "Яка перевага найбільш характерна для радіонапрямку?",
    options: ["Мінімальна витрата частот", "Циркулярна передача всім абонентам", "Вища прихованість і можливість спрямованих антен", "Не потребує радіоданих"],
    answer: 2,
    explanation: "Для радіонапрямку характерні швидке встановлення, надійність, прихованість і можливість застосування спрямованих антен."
  },
  {
    topic: "Організація зв'язку",
    question: "Головна перевага радіомережі порівняно з кількома радіонапрямками - це...",
    options: ["одночасна передача і прийом", "економія радіозасобів і частот та циркулярна передача", "можливість не використовувати позивні", "повна стійкість до радіозавад"],
    answer: 1,
    explanation: "Радіомережа дає змогу передавати циркулярно та потребує менше частот і засобів."
  },
  {
    topic: "Організація зв'язку",
    question: "Що характеризує абонентську групу?",
    options: ["Робота лише на одній незмінній частоті", "Робота на групі рівнодоступних частот", "Відсутність пріоритетних викликів", "Зв'язок тільки між двома абонентами"],
    answer: 1,
    explanation: "Абонентська група працює на групі рівнодоступних частот і підтримує пріоритетний та циркулярний виклик."
  },
  {
    topic: "Режими роботи",
    question: "Що відбувається в режимі чергового прийому?",
    options: ["Усі передавачі працюють безперервно", "Передавачі не вмикають, працюють приймачі", "Вимикають і передавачі, і приймачі", "Ведуть лише циркулярну передачу"],
    answer: 1,
    explanation: "У черговому прийомі передавачі не вмикають і не налаштовують з випромінюванням; працюють приймачі."
  },
  {
    topic: "Режими роботи",
    question: "Симплексний зв'язок - це...",
    options: ["одночасна передача обох станцій", "почергова передача і прийом", "передача лише цифрових даних", "робота без приймача"],
    answer: 1,
    explanation: "У симплексі сторони передають і приймають почергово."
  },
  {
    topic: "Режими роботи",
    question: "Яка ознака дуплексного зв'язку?",
    options: ["Обидві станції можуть передавати одночасно", "Використовується тільки одна антена", "Передача можлива лише за квитанцією", "Застосовуються тільки цифрові позивні"],
    answer: 0,
    explanation: "Дуплекс дозволяє обом сторонам одночасно передавати інформацію."
  },
  {
    topic: "Режими роботи",
    question: "У чому полягає FDD?",
    options: ["Передача і прийом розділені в часі на одній частоті", "Передача і прийом використовують різні частоти", "Частота змінюється випадково", "Працює лише один кореспондент"],
    answer: 1,
    explanation: "Frequency Division Duplex розділяє напрямки передачі та прийому за частотами."
  },
  {
    topic: "Режими роботи",
    question: "Що необхідне для TDD?",
    options: ["Дві незалежні антени", "Циркулярний позивний", "Синхронізація часових інтервалів", "Тільки різні частоти передачі й прийому"],
    answer: 2,
    explanation: "Time Division Duplex використовує одну частоту з розподілом у часі, тому потребує синхронізації."
  },
  {
    topic: "Позивні",
    question: "Для чого використовується позивний?",
    options: ["Для позначення типу антени", "Як умовне найменування радіостанції або абонента", "Для вимірювання частоти", "Для вибору потужності передавача"],
    answer: 1,
    explanation: "Позивний є умовним найменуванням радіостанції або абонента."
  },
  {
    topic: "Позивні",
    question: "Коли застосовують циркулярний позивний?",
    options: ["Для одночасного виклику всієї радіомережі", "Тільки для перевірки живлення", "Для зв'язку між двома станціями", "Після завершення сеансу"],
    answer: 0,
    explanation: "Циркулярний позивний дає змогу одночасно викликати всіх кореспондентів мережі."
  },
  {
    topic: "Радіообмін",
    question: "Що належить до службового радіообміну?",
    options: ["Передача бойової команди", "Телефонні переговори командира", "Узгодження частоти та встановлення зв'язку", "Передача документальної радіограми"],
    answer: 2,
    explanation: "Службовий обмін стосується встановлення зв'язку, зміни виду роботи, частот і проходження повідомлень."
  },
  {
    topic: "Радіообмін",
    question: "Що належить до оперативного радіообміну?",
    options: ["Перевірка чутності", "Узгодження переходу на іншу частоту", "Передача документальних повідомлень і переговори абонентів", "Налаштування антени"],
    answer: 2,
    explanation: "Оперативний обмін охоплює документальні повідомлення та безпосередні телефонні переговори абонентів."
  },
  {
    topic: "Встановлення зв'язку",
    question: "Яка правильна загальна послідовність виклику в радіонапрямку?",
    options: ["Свій позивний, команда, кінець", "Позивний кореспондента, «я», свій позивний, «прийом»", "«Прийом», свій позивний, частота", "Циркулярний позивний, пароль, відгук"],
    answer: 1,
    explanation: "Спочатку називають кореспондента, потім слово «я», власний позивний і «прийом»."
  },
  {
    topic: "Встановлення зв'язку",
    question: "Як відповідають радіостанції на циркулярний виклик мережі?",
    options: ["У довільному порядку", "Усі одночасно", "В установленій черговості", "Тільки головна станція"],
    answer: 2,
    explanation: "Щоб уникнути одночасних відповідей, кореспонденти відповідають у встановленій черговості."
  },
  {
    topic: "Передача сигналів",
    question: "Чи потрібні попередній виклик і згода на прийом перед передачею сигналу?",
    options: ["Так, завжди", "Лише в симплексі", "Ні", "Лише для циркулярної передачі"],
    answer: 2,
    explanation: "Сигнали передаються без попереднього виклику і без отримання згоди на прийом."
  },
  {
    topic: "Передача сигналів",
    question: "Скільки разів передають сам сигнал у радіонапрямку під час одного проговорювання?",
    options: ["Один раз", "Два рази", "Три рази", "До отримання відповіді"],
    answer: 1,
    explanation: "Після позивних сигнал передають двічі, а через 10 секунд повністю повторюють передачу."
  },
  {
    topic: "Передача сигналів",
    question: "Через який час повністю повторюють передачу сигналу?",
    options: ["Через 5 секунд", "Через 10 секунд", "Через 30 секунд", "Через одну хвилину"],
    answer: 1,
    explanation: "За встановленим порядком повну передачу сигналу повторюють через 10 секунд."
  },
  {
    topic: "Передача команд",
    question: "Як одержувач підтверджує прийняту команду?",
    options: ["Мовчанням", "Точним повторенням або словами «зрозумів» / «плюс»", "Лише власним позивним", "Передачею своєї частоти"],
    answer: 1,
    explanation: "На команду негайно дають квитанцію: точне повторення або «зрозумів» / «плюс»."
  },
  {
    topic: "Передача команд",
    question: "Скільки разів повторюють команду під час циркулярної передачі?",
    options: ["Один раз", "Два рази", "Три рази", "Чотири рази"],
    answer: 1,
    explanation: "При циркулярній передачі команду повторюють двічі."
  },
  {
    topic: "Безпека в ефірі",
    question: "Чому слід уникати довгих передач в ефірі?",
    options: ["Вони автоматично змінюють частоту", "Вони полегшують пеленгування та розпізнавання голосу", "Вони вимикають приймач", "Вони заборонені лише в дуплексі"],
    answer: 1,
    explanation: "Тривале випромінювання дає противнику більше часу для пеленгування та аналізу голосу."
  },
  {
    topic: "Безпека в ефірі",
    question: "Як слід повідомляти про дію радіозавад або РЕБ?",
    options: ["Відкритим текстом із детальним описом", "Через заздалегідь визначені кодові фрази", "Не повідомляти за жодних умов", "Лише персональним позивним"],
    answer: 1,
    explanation: "Відкрито описувати дію РЕБ не слід; для цього використовують погоджені кодові фрази."
  },
  {
    topic: "Радіодані",
    question: "Що, крім частот і позивних, може входити до даних радіооператора?",
    options: ["Час зміни даних, вид зв'язку, азимути та ключі", "Список особового складу підрозділу", "Маршрут руху всіх машин", "Лише серійний номер радіостанції"],
    answer: 0,
    explanation: "До радіооператора доводять потрібні для роботи частоти, позивні, час їх зміни, вид зв'язку та, за потреби, азимути й ключі."
  },
  {
    topic: "Організація зв'язку",
    question: "Який недолік має організація кількох радіонапрямків?",
    options: ["Неможливо застосовувати спрямовані антени", "Потрібно більше радіозасобів і частот", "Неможливо встановити зв'язок швидко", "Не можна передавати команди"],
    answer: 1,
    explanation: "Окремий напрямок на кожного кореспондента підвищує витрати радіозасобів і частот на пункті управління."
  },
  {
    topic: "Організація зв'язку",
    question: "Який недолік найбільш характерний для радіомережі?",
    options: ["Відсутність циркулярного виклику", "Неможливість мати більше двох абонентів", "Складніше застосовувати спрямовані антени", "Завжди потрібні різні частоти для кожного"],
    answer: 2,
    explanation: "У мережі складніше спрямувати антену одночасно на кількох кореспондентів, що може зменшувати прихованість і дальність."
  },
  {
    topic: "Організація зв'язку",
    question: "Який вид виклику підтримує абонентська група?",
    options: ["Лише індивідуальний", "Пріоритетний і циркулярний", "Лише аварійний", "Тільки через ретранслятор"],
    answer: 1,
    explanation: "Абонентська група забезпечує гнучку роботу, зокрема пріоритетний і циркулярний виклик."
  },
  {
    topic: "Організація зв'язку",
    question: "Що особливо важливо для роботи абонентської групи?",
    options: ["Відмова від радіоданих", "Дисципліна частот і точне дотримання радіоданих", "Однакова потужність усіх передавачів", "Робота тільки в дуплексі"],
    answer: 1,
    explanation: "Гнучкість абонентської групи вимагає чіткої частотної дисципліни та дотримання визначених радіоданих."
  },
  {
    topic: "Режими роботи",
    question: "Яким може бути симплекс за використанням частот?",
    options: ["Тільки одночастотним", "Тільки різночастотним", "Одночастотним або різночастотним", "Лише широкосмуговим"],
    answer: 2,
    explanation: "Симплекс передбачає почергову роботу сторін і може бути як одночастотним, так і різночастотним."
  },
  {
    topic: "Режими роботи",
    question: "Що розподіляється між напрямками зв'язку в TDD?",
    options: ["Кодові таблиці", "Часові інтервали", "Позивні", "Антени"],
    answer: 1,
    explanation: "У TDD передача і прийом використовують одну частоту, але різні часові інтервали."
  },
  {
    topic: "Режими роботи",
    question: "Що розподіляється між напрямками зв'язку в FDD?",
    options: ["Частоти", "Паролі", "Часові інтервали на одній частоті", "Квитанції"],
    answer: 0,
    explanation: "У FDD для передачі та прийому використовують різні частоти."
  },
  {
    topic: "Черговий прийом",
    question: "Яка дія зазвичай заборонена в режимі чергового прийому?",
    options: ["Робота приймача", "Контроль викликів", "Налаштування передавача з випромінюванням", "Приймання сигналів оповіщення"],
    answer: 2,
    explanation: "У черговому прийомі передавачі не вмикають і не налаштовують з випромінюванням в ефір."
  },
  {
    topic: "Позивні",
    question: "Які два основні види позивних розглянуто в темі?",
    options: ["Аналоговий і цифровий", "Індивідуальний і циркулярний", "Денний і нічний", "Основний і запасний канал"],
    answer: 1,
    explanation: "Позивний може належати окремій станції або використовуватися для одночасного виклику всієї мережі."
  },
  {
    topic: "Позивні",
    question: "Яка форма позивного часто використовується в телефонних мережах?",
    options: ["Назва частоти й час", "Слово та двозначне число", "Лише прізвище оператора", "Три координати"],
    answer: 1,
    explanation: "У телефонних мережах позивний часто складається зі слова й двозначного числа."
  },
  {
    topic: "Радіообмін",
    question: "До якого виду радіообміну належить зміна виду роботи?",
    options: ["Оперативного", "Службового", "Циркулярного", "Документального"],
    answer: 1,
    explanation: "Зміна виду роботи є питанням забезпечення каналу, тому належить до службового радіообміну."
  },
  {
    topic: "Радіообмін",
    question: "До якого виду радіообміну належать безпосередні телефонні переговори абонентів?",
    options: ["Службового", "Технічного", "Оперативного", "Чергового"],
    answer: 2,
    explanation: "Безпосередні переговори абонентів по радіоканалу належать до оперативного радіообміну."
  },
  {
    topic: "Радіообмін",
    question: "Який перелік містить тільки види повідомлень, згадані в темі?",
    options: ["Радіограми, сигнали, команди, файли передачі даних", "Накази, карти, фотографії, паролі", "Частоти, антени, ключі, батареї", "Виклики, завади, ретранслятори, кабелі"],
    answer: 0,
    explanation: "Повідомлення поділяють на радіограми, сигнали, команди та файли передачі даних."
  },
  {
    topic: "Встановлення зв'язку",
    question: "Яке підтвердження використовують після відповіді кореспондента під час встановлення зв'язку?",
    options: ["«Прийнято, прийом»", "«Кінець зв'язку»", "«Повторіть частоту»", "«Зрозумів двічі»"],
    answer: 0,
    explanation: "Після відповіді кореспондента встановлення зв'язку підтверджують словами «прийнято, прийом»."
  },
  {
    topic: "Встановлення зв'язку",
    question: "Коли допускається скорочений порядок встановлення зв'язку?",
    options: ["За доброї чутності", "Тільки за наявності завад", "Лише в дуплексі", "Під час циркулярної команди"],
    answer: 0,
    explanation: "За доброї чутності дозволяється скорочений порядок із використанням власного позивного."
  },
  {
    topic: "Встановлення зв'язку",
    question: "Як викликати кількох конкретних абонентів радіомережі?",
    options: ["Тільки циркулярним позивним", "Послідовно назвати їхні індивідуальні позивні", "Передати лише свій позивний", "Перейти в режим чергового прийому"],
    answer: 1,
    explanation: "Кількох визначених кореспондентів можна викликати за їхніми індивідуальними позивними."
  },
  {
    topic: "Передача сигналів",
    question: "Коли сигнал вважається переданим і прийнятим?",
    options: ["Одразу після першого проговорювання", "Після отримання квитанції", "Після зміни частоти", "Через одну хвилину незалежно від відповіді"],
    answer: 1,
    explanation: "Завершення передачі підтверджує квитанція кореспондента; після неї сигнал вважається прийнятим."
  },
  {
    topic: "Передача сигналів",
    question: "Чим завершується повна передача сигналу в радіонапрямку?",
    options: ["Словом «прийом»", "Назвою частоти", "Паролем", "Словом «мовчання»"],
    answer: 0,
    explanation: "Після повторення сигналу передають слово «прийом», очікуючи квитанцію."
  },
  {
    topic: "Передача команд",
    question: "Що передавач говорить після правильної квитанції на команду?",
    options: ["«Прийнято» або «плюс»", "«Повторіть позивний»", "«Зміна частоти»", "«Мовчання»"],
    answer: 0,
    explanation: "Передавач підтверджує правильність прийому команди словом «прийнято» або «плюс»."
  },
  {
    topic: "Безпека в ефірі",
    question: "Що застосовують для перевірки «свій-чужий»?",
    options: ["Постійну пару позивних", "Одноразову пару «пароль - відгук»", "Відкриту назву підрозділу", "Номер мобільного телефону"],
    answer: 1,
    explanation: "Для розпізнавання використовують одноразові пари «пароль - відгук», які не слід повторно застосовувати."
  },
  {
    topic: "Безпека в ефірі",
    question: "Яку функцію телефона не слід використовувати в районі виконання завдань?",
    options: ["Будильник", "Калькулятор", "Wi-Fi точку доступу", "Ліхтарик"],
    answer: 2,
    explanation: "У правилах безпеки окремо заборонено використовувати телефон як Wi-Fi точку доступу."
  },
  {
    topic: "Безпека в ефірі",
    question: "Які позивні доцільніше використовувати з погляду прихованості?",
    options: ["Персоналізовані й легко впізнавані", "Знеособлені цифрові", "Справжні прізвища", "Назви посад"],
    answer: 1,
    explanation: "Знеособлені цифрові позивні менше розкривають особу, посаду чи належність абонента."
  },
  {
    topic: "Безпека в ефірі",
    question: "Яка поведінка в ефірі є правильною?",
    options: ["Обговорювати суперечки до повного вирішення", "Передавати коротко й не вести суперечок", "Завжди називати справжні імена", "Детально описувати роботу РЕБ"],
    answer: 1,
    explanation: "Радіодисципліна вимагає коротких передач, відсутності суперечок і мінімуму зайвої інформації."
  },
  {
    topic: "Безпека в ефірі",
    question: "Який захід зменшує ризик визначення місця після сеансу мобільного зв'язку?",
    options: ["Збільшення гучності", "Зміна місця дислокації за потреби", "Повторення повідомлення", "Увімкнення Wi-Fi"],
    answer: 1,
    explanation: "Мобільний зв'язок слід мінімізувати, а після сеансу за потреби змінювати місце дислокації."
  }
];

const letters = ["А", "Б", "В", "Г"];
const QUIZ_SIZE = 25;
const STATE_VERSION = 2;
const ACTIVE_STATE_KEY = "vos420-topic1-active-v2";
const BEST_SCORE_KEY = "vos420-topic1-best";

const state = {
  questions: [],
  index: 0,
  score: 0,
  selected: null,
  answered: false,
  mistakes: [],
  activeElapsedMs: 0,
  timerStartedAt: null
};

let pendingSavedState = null;

const elements = {
  resumePanel: document.querySelector("#resumePanel"),
  resumeSummary: document.querySelector("#resumeSummary"),
  resumeButton: document.querySelector("#resumeButton"),
  newQuizButton: document.querySelector("#newQuizButton"),
  quizPanel: document.querySelector("#quizPanel"),
  resultPanel: document.querySelector("#resultPanel"),
  questionTopic: document.querySelector("#questionTopic"),
  questionText: document.querySelector("#questionText"),
  answers: document.querySelector("#answers"),
  feedback: document.querySelector("#feedback"),
  feedbackTitle: document.querySelector("#feedbackTitle"),
  feedbackText: document.querySelector("#feedbackText"),
  referenceLink: document.querySelector("#referenceLink"),
  checkButton: document.querySelector("#checkButton"),
  nextButton: document.querySelector("#nextButton"),
  restartButton: document.querySelector("#restartButton"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  scoreText: document.querySelector("#scoreText"),
  bestText: document.querySelector("#bestText"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMessage: document.querySelector("#resultMessage"),
  resultCorrectTotal: document.querySelector("#resultCorrectTotal"),
  resultGrade: document.querySelector("#resultGrade"),
  resultPercent: document.querySelector("#resultPercent"),
  resultTime: document.querySelector("#resultTime"),
  mistakes: document.querySelector("#mistakes")
};

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function referenceFor(item) {
  if (item.topic === "Керівні документи" || item.topic === "Радіодані") return "#orhanizatsiini-dokumenty";
  if (item.topic === "Черговий прийом") return "#cherhovyi-pryiom";
  if (item.topic === "Позивні") return "#pozyvnyi";
  if (item.topic === "Передача сигналів") return "#peredacha-syhnaliv";
  if (item.topic === "Передача команд") return "#peredacha-komand";
  if (item.topic === "Безпека в ефірі") return "#bezpeka-v-efiri";
  if (item.topic === "Встановлення зв'язку") {
    return item.question.includes("радіомереж") ? "#zviazok-u-radiomerezhi" : "#zviazok-u-radionapriamku";
  }
  if (item.topic === "Режими роботи") {
    return item.question.toLowerCase().includes("симплекс") ? "#sympleks" : "#dupleks";
  }
  if (item.topic === "Радіообмін") {
    const text = item.question.toLowerCase();
    return text.includes("служб") || text.includes("зміна виду")
      ? "#sluzhbovyi-radioobmin"
      : "#operatyvnyi-radioobmin";
  }
  if (item.topic === "Організація зв'язку") {
    const text = item.question.toLowerCase();
    if (text.includes("радіонапрям")) return "#radionapriamok";
    if (text.includes("радіомереж")) return "#radiomerezha";
    if (text.includes("абонентськ")) return "#abonentska-hrupa";
    return "#porivniannia-orhanizatsii";
  }
  return "#osnovni-poniattia";
}

function prepareQuestions() {
  return shuffled(questionBank).slice(0, QUIZ_SIZE).map((item) => {
    const options = item.options.map((text, index) => ({
      text,
      correct: index === item.answer
    }));
    return {
      id: `q-${questionBank.indexOf(item) + 1}`,
      topic: item.topic,
      question: item.question,
      explanation: item.explanation,
      reference: referenceFor(item),
      options: shuffled(options)
    };
  });
}

function currentElapsed() {
  return state.activeElapsedMs + (state.timerStartedAt ? Date.now() - state.timerStartedAt : 0);
}

function startTimer() {
  if (!state.timerStartedAt && !document.hidden && !elements.quizPanel.hidden) state.timerStartedAt = Date.now();
}

function pauseTimer() {
  if (!state.timerStartedAt) return;
  state.activeElapsedMs += Date.now() - state.timerStartedAt;
  state.timerStartedAt = null;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function gradeFor(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 500) / 100;
}

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_STATE_KEY));
    const valid = saved
      && saved.version === STATE_VERSION
      && Array.isArray(saved.questions)
      && saved.questions.length === QUIZ_SIZE
      && Number.isInteger(saved.index)
      && saved.index >= 0
      && saved.index < QUIZ_SIZE;
    return valid ? saved : null;
  } catch {
    return null;
  }
}

function saveState() {
  if (!state.questions.length) return;
  try {
    localStorage.setItem(ACTIVE_STATE_KEY, JSON.stringify({
      version: STATE_VERSION,
      updatedAt: Date.now(),
      questions: state.questions,
      index: state.index,
      score: state.score,
      selected: state.selected,
      answered: state.answered,
      mistakes: state.mistakes,
      activeElapsedMs: currentElapsed()
    }));
  } catch {
    // The current page remains usable when local storage is unavailable.
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(ACTIVE_STATE_KEY);
  } catch {
    // No action is needed when local storage is unavailable.
  }
}

function readBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  const best = Math.max(readBestScore(), score);
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(best));
  } catch {
    // The quiz still works when local storage is unavailable.
  }
  return best;
}

function updateHeader() {
  const total = state.questions.length;
  elements.progressText.textContent = `${state.index + 1} / ${total}`;
  elements.progressBar.style.width = `${((state.index + 1) / total) * 100}%`;
  elements.scoreText.textContent = String(state.score);
  const best = readBestScore();
  elements.bestText.textContent = best ? `${best}/${total}` : "-";
}

function selectAnswer(index) {
  if (state.answered) return;
  state.selected = index;
  elements.checkButton.disabled = false;
  [...elements.answers.children].forEach((button, buttonIndex) => {
    button.classList.toggle("selected", buttonIndex === index);
    button.setAttribute("aria-checked", buttonIndex === index ? "true" : "false");
  });
  saveState();
}

function showAnsweredQuestion() {
  const item = state.questions[state.index];
  const selectedOption = item.options[state.selected];
  const correctIndex = item.options.findIndex((option) => option.correct);
  [...elements.answers.children].forEach((button, index) => {
    button.disabled = true;
    if (index === correctIndex) button.classList.add("correct");
    if (index === state.selected && !selectedOption.correct) button.classList.add("incorrect");
  });
  elements.feedbackTitle.textContent = selectedOption.correct ? "Правильно" : "Неправильно";
  elements.feedback.classList.toggle("wrong", !selectedOption.correct);
  elements.feedbackText.textContent = item.explanation;
  elements.referenceLink.href = `index.html${item.reference}`;
  elements.feedback.hidden = false;
  elements.checkButton.hidden = true;
  elements.nextButton.textContent = state.index === state.questions.length - 1 ? "Показати результат" : "Наступне питання";
  elements.nextButton.hidden = false;
}

function renderQuestion(restore = false) {
  const item = state.questions[state.index];
  if (!restore) {
    state.selected = null;
    state.answered = false;
  }
  elements.questionTopic.textContent = item.topic;
  elements.questionText.textContent = item.question;
  elements.answers.replaceChildren();
  elements.feedback.hidden = true;
  elements.feedback.classList.remove("wrong");
  elements.checkButton.hidden = false;
  elements.checkButton.disabled = true;
  elements.nextButton.hidden = true;

  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", index === state.selected ? "true" : "false");
    button.classList.toggle("selected", index === state.selected);
    button.innerHTML = `<span class="answer-letter">${letters[index]}</span><span></span>`;
    button.lastElementChild.textContent = option.text;
    button.addEventListener("click", () => selectAnswer(index));
    elements.answers.append(button);
  });

  if (state.answered && state.selected !== null) {
    showAnsweredQuestion();
  } else {
    elements.checkButton.disabled = state.selected === null;
  }
  updateHeader();
  saveState();
}

function checkAnswer() {
  if (state.selected === null || state.answered) return;
  state.answered = true;
  const item = state.questions[state.index];
  const selectedOption = item.options[state.selected];
  const correctIndex = item.options.findIndex((option) => option.correct);

  if (selectedOption.correct) {
    state.score += 1;
    elements.feedbackTitle.textContent = "Правильно";
  } else {
    elements.feedbackTitle.textContent = "Неправильно";
    elements.feedback.classList.add("wrong");
    state.mistakes.push({
      question: item.question,
      selected: selectedOption.text,
      correct: item.options[correctIndex].text,
      explanation: item.explanation,
      reference: item.reference
    });
  }

  showAnsweredQuestion();
  elements.scoreText.textContent = String(state.score);
  saveState();
  elements.nextButton.focus();
}

function renderMistakes() {
  elements.mistakes.replaceChildren();
  if (!state.mistakes.length) {
    const message = document.createElement("p");
    message.className = "note";
    message.textContent = "Жодної помилки. Матеріал засвоєно відмінно.";
    elements.mistakes.append(message);
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = "Розбір помилок";
  elements.mistakes.append(heading);

  state.mistakes.forEach((mistake, index) => {
    const article = document.createElement("article");
    article.className = "mistake-item";
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${mistake.question}`;
    const selected = document.createElement("p");
    selected.className = "mistake-answer";
    selected.textContent = `Твоя відповідь: ${mistake.selected}`;
    const correct = document.createElement("p");
    correct.className = "correct-answer";
    correct.textContent = `Правильна відповідь: ${mistake.correct}`;
    const explanation = document.createElement("p");
    explanation.textContent = mistake.explanation;
    const reference = document.createElement("a");
    reference.className = "mistake-reference";
    reference.href = `index.html${mistake.reference}`;
    reference.target = "_blank";
    reference.rel = "noopener";
    reference.textContent = "Переглянути відповідний фрагмент конспекту";
    article.append(title, selected, correct, explanation, reference);
    elements.mistakes.append(article);
  });
}

function showResults() {
  pauseTimer();
  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);
  const best = saveBestScore(state.score);
  clearSavedState();
  elements.resumePanel.hidden = true;
  elements.quizPanel.hidden = true;
  elements.resultPanel.hidden = false;
  elements.progressBar.style.width = "100%";
  elements.bestText.textContent = `${best}/${total}`;
  elements.resultCorrectTotal.textContent = `${state.score}/${total}`;
  elements.resultGrade.textContent = `${gradeFor(state.score, total)}/5`;
  elements.resultPercent.textContent = `${percent}%`;
  elements.resultTime.textContent = formatDuration(state.activeElapsedMs);

  if (percent >= 92) {
    elements.resultTitle.textContent = "Відмінна готовність";
    elements.resultMessage.textContent = "Терміни й порядок радіообміну засвоєні впевнено.";
  } else if (percent >= 76) {
    elements.resultTitle.textContent = "Добрий результат";
    elements.resultMessage.textContent = "Повтори питання з помилками й зверни увагу на точні формулювання.";
  } else if (percent >= 60) {
    elements.resultTitle.textContent = "Основа є, потрібне повторення";
    elements.resultMessage.textContent = "Перечитай порядок передачі сигналів, режими роботи та способи організації зв'язку.";
  } else {
    elements.resultTitle.textContent = "Тему варто пройти ще раз";
    elements.resultMessage.textContent = "Почни з екзаменаційного мінімуму й основних понять, потім повтори вікторину.";
  }

  renderMistakes();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextQuestion() {
  if (state.index === state.questions.length - 1) {
    showResults();
    return;
  }
  state.index += 1;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz() {
  clearSavedState();
  state.questions = prepareQuestions();
  state.index = 0;
  state.score = 0;
  state.selected = null;
  state.answered = false;
  state.mistakes = [];
  state.activeElapsedMs = 0;
  state.timerStartedAt = null;
  elements.resumePanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.quizPanel.hidden = false;
  startTimer();
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showResumeChoice(saved) {
  pendingSavedState = saved;
  const completed = saved.index + (saved.answered ? 1 : 0);
  elements.resumeSummary.textContent = `Збережено питання ${saved.index + 1} з ${QUIZ_SIZE}. Правильних відповідей: ${saved.score}; опрацьовано: ${completed}; активний час: ${formatDuration(saved.activeElapsedMs || 0)}.`;
  elements.resumePanel.hidden = false;
  elements.quizPanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.progressText.textContent = `${saved.index + 1} / ${QUIZ_SIZE}`;
  elements.progressBar.style.width = `${((saved.index + 1) / QUIZ_SIZE) * 100}%`;
  elements.scoreText.textContent = String(saved.score);
  const best = readBestScore();
  elements.bestText.textContent = best ? `${best}/${QUIZ_SIZE}` : "-";
}

function resumeQuiz() {
  if (!pendingSavedState) {
    startQuiz();
    return;
  }
  state.questions = pendingSavedState.questions;
  state.index = pendingSavedState.index;
  state.score = pendingSavedState.score;
  state.selected = pendingSavedState.selected;
  state.answered = pendingSavedState.answered;
  state.mistakes = pendingSavedState.mistakes || [];
  state.activeElapsedMs = pendingSavedState.activeElapsedMs || 0;
  state.timerStartedAt = null;
  pendingSavedState = null;
  elements.resumePanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.quizPanel.hidden = false;
  startTimer();
  renderQuestion(true);
}

elements.checkButton.addEventListener("click", checkAnswer);
elements.nextButton.addEventListener("click", nextQuestion);
elements.restartButton.addEventListener("click", startQuiz);
elements.resumeButton.addEventListener("click", resumeQuiz);
elements.newQuizButton.addEventListener("click", startQuiz);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseTimer();
    saveState();
  } else {
    startTimer();
  }
});
window.addEventListener("pagehide", () => {
  pauseTimer();
  saveState();
});
setInterval(saveState, 5000);

const savedState = readSavedState();
if (savedState) {
  showResumeChoice(savedState);
} else {
  startQuiz();
}
