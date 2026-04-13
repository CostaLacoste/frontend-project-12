import Rollbar from 'rollbar'

const accessToken = import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN

const rollbar = accessToken
  ? new Rollbar({
      accessToken,
      environment: import.meta.env.MODE,
      captureUncaught: true,
      captureUnhandledRejections: true,
    })
  : null

export default rollbar
