import axios from 'axios'
import { setAuthTokenAxios, resetAuthTokenAxios } from '@/utils/auth.js'

export const state = () => ({
  accessToken: false,
  refreshToken: false,
  username: false,
  email: false,
  workspace: false
})


export const mutations =  {
  mutation (state, {mutate, payload}) {
    state[mutate] = payload
  },
}

export const actions =  {

  setAccessToken (context, payload) {
    context.commit('mutation', {mutate: 'accessToken', payload })
    if (payload) {
      // context.commit('mutation', {mutate: 'accessToken', payload: 'Bearer ' + payload })
      setAuthTokenAxios('Bearer ' + payload)
    } else {
      context.commit('mutation', {mutate: 'accessToken', payload })
      resetAuthTokenAxios()

    }
  },

  async signUp (context,  payload) {
    var response
    response = await axios.post(process.env.DEV_API_URL + '/auth/signup', {
      ...payload,
      secret: window.authSecret || '123'
    })
    return response
  },

  async profile ({commit}, { auth }) {
    var response = await axios.get(process.env.DEV_API_URL + '/auth/profile', { headers: { 'Authorization': auth } } )

    commit('mutation', { mutate: 'username', payload: response.data.username})
    // commit('mutation', { mutate: 'workspace', payload: response.data.username})

    return true
  },

	async signIn ({commit, dispatch}, payload) {

    var response
    // response = await axios.post(process.env.DEV_API_URL + '/auth/signin', payload)
    response = await axios.post(process.env.DEV_API_URL + '/auth/signin', payload)

    var accessToken = response.data.accessToken ? ('Bearer ' + response.data.accessToken) : false
    var refreshToken = response.data.refreshToken ? ('Bearer ' + response.data.refreshToken) : false

    dispatch('setTokenCookies', {accessToken, refreshToken})

    dispatch('setAccessToken', accessToken)
    commit('mutation', { mutate: 'refreshToken', payload: refreshToken})

    if (accessToken) {
      await dispatch('profile', { auth: accessToken} )
    } else {
      commit('mutation', { mutate: 'username', payload: false})
    }

  },

	async signOut ({commit, dispatch}, payload) {

    dispatch('setTokenCookies', {refreshToken: false, accessToken: false})
    dispatch('setAccessToken', false)
    commit('mutation', { mutate: 'username', payload: false})
    commit('mutation', { mutate: 'refreshToken', payload: false})
  },

  async serverInit ({dispatch, commit, state}, payload) {

    const accessToken = this.$cookies.get('x-access-token')
    if (accessToken) {
      try {
        await dispatch('profile', { auth: accessToken })
        dispatch('setAccessToken', accessToken)
        return true
      } catch (err) {
        console.error('Provided token is invalid')
        dispatch('setAccessToken', false)
        return false
      }
    } else {
      dispatch('setAccessToken', false)
      return false
    }

  },

  async setTokenCookies (context, { accessToken, refreshToken }) {

    if (accessToken) {
      this.$cookies.set('x-access-token', accessToken)
    } else if (accessToken!==undefined) {
      this.$cookies.remove('x-access-token')
    }
    if (refreshToken) {
      this.$cookies.set('x-refresh-token', refreshToken)
    } else if (refreshToken!==undefined) {
      this.$cookies.remove('x-refresh-token')
    }

  }
}

export const getters =  {
  isAuthenticated (state) {
    return state.accessToken && state.username
  },
  isInWorkspace (state) {
    return state.accessToken && state.username && state.workspace
  },
}
