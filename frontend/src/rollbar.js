import Rollbar from 'rollbar'

const accessToken = import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN

let rollbar = null

if (accessToken) {
  rollbar = new Rollbar({
    accessToken,
    environment: import.meta.env.MODE,
    captureUncaught: true,
    captureUnhandledRejections: true,
  })
}

export default rollbar
