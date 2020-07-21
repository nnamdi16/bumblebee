import axios from 'axios'
import { setAuthTokenAxios, resetAuthTokenAxios } from '@/utils/auth.js'

export const state = () => ({
  accessToken: false,
  refreshToken: false,
  username: false,
  email: false,
  workspace: false,
  workspaceStatus: false,
  key: false,
  socket: false
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

  async saveWorkspace ({dispatch, commit, state, rootState}) {
    commit('mutation', { mutate: 'workspaceStatus', payload: 'uploading' })
    try {

      var commands = rootState.commands.map(e=>{
        var { newDfName, done, error, ...cell} = e
        return JSON.stringify(cell)
      })

      var dataSources = rootState.dataSources.map(e=>{
        var { done, error, ...cell} = e
        return JSON.stringify(cell)
      })

      var payload = {
        tabs: rootState.datasets.map(e=>{
          var {dataSources, name, ...profiling} = e
          return {
            name,
            profiling: JSON.stringify(profiling),
          }
        }),
        commands: [...dataSources, ...commands]
      }

      // console.log('[WORKSPACE MANAGING]',{payload})

      var response = await dispatch('request', {
        request: 'put',
        path: `/workspaces/${state.workspace._id}`,
        payload
      }, { root: true })

      commit('mutation', { mutate: 'workspaceStatus', payload: 'ok' })

      return response

    } catch (err) {
      commit('mutation', { mutate: 'workspaceStatus', payload: 'error' })
      throw err
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

  async startWorkspace ({commit, dispatch, state}, id) {


    // console.log('[WORKSPACE MANAGING] startWorkspace')

    var workspace = state.workspace

    // if (id && workspace && id === workspace._id) {
    //   return workspace
    // }

    if (!id) {
      if (workspace && workspace._id) {
        id = workspace._id
      } else {
        return false
      }
    }

    var response = await dispatch('request',{
      path: `/workspaces/${id}`
    }, { root: true })

    var tabs = response.data.tabs.map(e=>{
      var profiling = JSON.parse(e.profiling)
      return {
        name: e.name,
        dataSources: e.dataSources,
        ...profiling
      }
    })


    var cells = response.data.commands.map( e=>({ ...JSON.parse(e), done: false }) )

    var commands = cells.filter(e=>!(e && e.payload && e.payload.request && e.payload.request.isLoad))
    var dataSources = cells.filter(e=>e && e.payload && e.payload.request && e.payload.request.isLoad)

    // console.log('[WORKSPACE MANAGING]',{ cells, tabs })

    var tab = -1

    tabs.forEach((dataset, index) => {
      // commit('mutation', { mutate: 'tab', payload: index }, { root: true })
      // console.log('[WORKSPACE MANAGING] loading dataset', { dataset })
      if (dataset.columns) {
        commit('setDataset', { dataset, tab: index }, { root: true })
        if (tab<0) {
          tab = index
        }
      } else {
        commit('newDataset', { dataset, current: true, tab: index }, { root: true })
      }
    })

    commit('mutation', { mutate: 'commands', payload: commands }, { root: true })
    commit('mutation', { mutate: 'dataSources', payload: dataSources}, { root: true })
    commit('mutation', { mutate: 'workspace', payload: response.data })

    commit('mutation', {mutate: 'tab', payload: tab}, { root: true })

    return response.data

  },

  cleanSession ({commit}) {

    commit('mutation', { mutate: 'tab', payload: 0 }, { root: true })
    commit('mutation', { mutate: 'commands', payload: [] }, { root: true })
    commit('mutation', { mutate: 'workspace', payload: false }, {root: true})
    commit('mutation', { mutate: 'datasets', payload: [] }, { root: true })
    commit('mutation', { mutate: 'datasetSelection', payload: [] }, { root: true })
    commit('mutation', { mutate: 'secondaryDatasets', payload: [] }, { root: true })
    commit('mutation', { mutate: 'databases', payload: [] }, { root: true })
    commit('mutation', { mutate: 'buffers', payload: [] }, { root: true })
    commit('mutation', { mutate: 'listViews', payload: [] }, { root: true })
    commit('clearDatasetProperties', {}, { root: true })
  },

  async profile ({commit}, { auth }) {
    var response = await axios.get(process.env.DEV_API_URL + '/auth/profile', { headers: { 'Authorization': auth } } )

    commit('mutation', { mutate: 'username', payload: response.data.username})

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
    return state.accessToken && state.username && state.workspace._id
  },
}
