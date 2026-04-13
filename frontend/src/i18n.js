import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ru: {
    translation: {
      header: {
        brand: 'Hexlet Chat',
        logout: 'Выйти',
      },
      common: {
        cancel: 'Отмена',
        submit: 'Отправить',
        remove: 'Удалить',
        required: 'Обязательное поле',
      },
      chat: {
        loading: 'Загрузка чата...',
        error: 'Ошибка: {{message}}',
        channels: 'Каналы',
        addChannel: '+ Добавить канал',
        manage: 'Управление',
        rename: 'Переименовать',
        remove: 'Удалить',
        title: 'Чат',
        titleWithChannel: 'Чат: # {{name}}',
        messagePlaceholder: 'Введите сообщение...',
        send: 'Отправить',
      },
      modals: {
        addChannelTitle: 'Добавить канал',
        renameChannelTitle: 'Переименовать канал',
        removeChannelTitle: 'Удалить канал',
        removeConfirm: 'Вы уверены, что хотите удалить канал?',
      },
      auth: {
        loginTitle: 'Войти',
        signupTitle: 'Регистрация',
        username: 'Ваш ник',
        password: 'Пароль',
        confirmPassword: 'Подтвердите пароль',
        signIn: 'Войти',
        register: 'Зарегистрироваться',
        noAccount: 'Нет аккаунта?',
        signUpLink: 'Регистрация',
        hasAccount: 'Уже есть аккаунт?',
        logInLink: 'Войти',
        invalidCredentials: 'Ошибка авторизации. Проверьте имя пользователя или пароль.',
        signupFailed: 'Ошибка регистрации. Попробуйте еще раз.',
        userExists: 'Пользователь с таким именем уже существует',
      },
      validation: {
        channelLength: 'От 3 до 20 символов',
        unique: 'Должно быть уникальным',
        usernameLength: 'Имя пользователя должно быть от 3 до 20 символов',
        passwordLength: 'Пароль должен быть не менее 6 символов',
        passwordsMatch: 'Пароли должны совпадать',
      },
      notFound: {
        title: '404',
        text: 'Страница не найдена.',
      },
      toast: {
        noNetwork: 'Отсутствует соединение с сетью',
        loadingError: 'Ошибка загрузки данных',
        channelCreated: 'Канал создан',
        channelRenamed: 'Канал переименован',
        channelRemoved: 'Канал удален',
      },
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
