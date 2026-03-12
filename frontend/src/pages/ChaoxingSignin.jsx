import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { AlertCircle, CheckCircle2, Loader2, Camera, MapPin, QrCode, CheckSquare, Clock, TrendingUp, RefreshCw } from 'lucide-react'

import { getToken, isAuthenticated, removeToken } from '../utils/auth'

import { Button, Input } from '../components'



const POLL_INTERVAL_MS = 3000

const CHAOXING_API_BASE = '/api/v1/chaoxing'

const CHAOXING_SETTINGS_KEY = 'chaoxing_signin_settings_v1'

const DEFAULT_CHECK_INTERVAL_MINUTES = 5

const MIN_CHECK_INTERVAL_MINUTES = 1

const MAX_CHECK_INTERVAL_MINUTES = 60

const AUTO_SIGN_TASK_COOLDOWN_MS = 2 * 60 * 1000

const BACKGROUND_TASK_MAX_ITEMS = 50

const BACKGROUND_RUNNING_STATUS_SET = new Set(['running', 'pending', 'processing', 'queued', 'in_progress', 'in-progress'])

const TOKEN_ERROR_PATTERN = /(invalid token|token has expired|token validation failed|missing token)/i

const GLASS_CARD_CLASS = 'rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-lg transition-all duration-200'

const GLASS_PANEL_CLASS = 'rounded-xl border border-white/30 bg-white/60 p-4 backdrop-blur-sm transition-all duration-200'

const SIGN_TYPE_FALLBACK_MAP = {

  gesture: 'normal',

  code: 'normal'

}



const parsePayload = async (response) => {

  const text = await response.text()

  if (!text) return {}

  try {

    return JSON.parse(text)

  } catch (_) {

    return { message: text }

  }

}



const pickMessage = (payload) => {

  if (!payload) return ''

  return payload.msg || payload.message || payload.detail || payload.data?.message || ''

}



const appendPayloadToFormData = (formData, payload) => {

  Object.entries(payload).forEach(([key, value]) => {

    if (value === null || value === undefined || value === '') return

    if (Array.isArray(value) || (typeof value === 'object' && !(value instanceof File))) {

      formData.append(key, JSON.stringify(value))

      return

    }

    formData.append(key, String(value))

  })

}



const clampCheckInterval = (value) => {

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return DEFAULT_CHECK_INTERVAL_MINUTES

  return Math.min(MAX_CHECK_INTERVAL_MINUTES, Math.max(MIN_CHECK_INTERVAL_MINUTES, Math.floor(parsed)))

}



const safeStringify = (value) => {

  try {

    return JSON.stringify(value)

  } catch (_) {

    return '[Unserializable log]'

  }

}



const normalizeCourseText = (value) => String(value ?? '').trim()



const buildCourseSelector = (course) => {

  const existingId = normalizeCourseText(course?.id)

  if (existingId.includes('_')) return existingId



  const courseId = normalizeCourseText(course?.courseId || course?.course_id || course?.rawCourseId || existingId)

  const classId = normalizeCourseText(course?.classId || course?.clazzId || course?.class_id || course?.clazz_id)

  const cpi = normalizeCourseText(course?.cpi)



  if (courseId && classId) {

    return cpi ? `${courseId}_${classId}_${cpi}` : `${courseId}_${classId}`

  }



  return courseId || classId

}



const getCourseDisplayName = (course, fallbackLabel = '') => {
  const name = [
    course?.courseName,
    course?.name,
    course?.title,
    course?.course_name,
    course?.courseTitle,
    course?.course_title,
    course?.className,
    course?.clazzName,
  ]
    .map(normalizeCourseText)
    .find(Boolean)
  const selector = buildCourseSelector(course)
  return name || fallbackLabel || (selector ? `课程 ${selector}` : '未命名课程')
}

const normalizeSignTypeForApi = (value) => {

  return SIGN_TYPE_FALLBACK_MAP[value] || value || 'all'

}



const shouldUseLocationParams = (value) => {

  return value === 'location' || value === 'qrcode'

}



const parseTaskTimestamp = (value) => {

  if (value === undefined || value === null || value === '') return 0

  if (typeof value === 'number') {

    return value > 1e12 ? value : value * 1000

  }

  const parsed = new Date(value).getTime()

  return Number.isFinite(parsed) ? parsed : 0

}



const extractBackgroundTaskId = (task) => {

  const rawId = task?.task_id ?? task?.taskId ?? task?.id

  if (rawId === undefined || rawId === null || rawId === '') return ''

  return String(rawId).trim()

}



const normalizeBackgroundTaskRecord = (task = {}) => {

  const normalizedTaskId = extractBackgroundTaskId(task)

  if (!normalizedTaskId) return null

  const updatedAt = task?.updated_at || task?.updatedAt || task?.timestamp || task?.created_at || task?.createdAt || ''

  const createdAt = task?.created_at || task?.createdAt || updatedAt || ''

  return {

    taskId: normalizedTaskId,

    status: String(task?.status || task?.state || task?.task_status || task?.taskStatus || 'unknown').toLowerCase(),

    message: String(task?.message || task?.detail || task?.msg || ''),

    courseName: String(task?.courseName || task?.course_name || task?.name || task?.title || ''),

    signType: String(task?.sign_type || task?.type || ''),

    progress: task?.progress && typeof task.progress === 'object' ? task.progress : null,

    updatedAt,

    createdAt

  }

}



const sortBackgroundTasks = (tasks) => {

  return [...tasks].sort((a, b) => {

    const aTime = parseTaskTimestamp(a.updatedAt || a.createdAt)

    const bTime = parseTaskTimestamp(b.updatedAt || b.createdAt)

    return bTime - aTime

  })

}



const normalizeBackgroundTaskHistory = (payload) => {

  const candidates = [

    payload?.data?.tasks,

    payload?.data?.list,

    payload?.data?.history,

    payload?.data?.records,

    payload?.data,

    payload?.tasks,

    payload?.list,

    payload?.history,

    payload?.records,

    payload

  ]

  const source = candidates.find((candidate) => Array.isArray(candidate)) || []

  const taskMap = new Map()



  source.forEach((task) => {

    const normalized = normalizeBackgroundTaskRecord(task)

    if (!normalized) return

    const existing = taskMap.get(normalized.taskId)

    if (!existing) {

      taskMap.set(normalized.taskId, normalized)

      return

    }

    const existingTime = parseTaskTimestamp(existing.updatedAt || existing.createdAt)

    const nextTime = parseTaskTimestamp(normalized.updatedAt || normalized.createdAt)

    taskMap.set(normalized.taskId, nextTime >= existingTime ? { ...existing, ...normalized } : existing)

  })



  return sortBackgroundTasks(Array.from(taskMap.values())).slice(0, BACKGROUND_TASK_MAX_ITEMS)

}



const upsertBackgroundTaskHistory = (history, task) => {

  const normalized = normalizeBackgroundTaskRecord(task)

  if (!normalized) return history

  const merged = [normalized, ...(history || []).filter((item) => item.taskId !== normalized.taskId)]

  return sortBackgroundTasks(merged).slice(0, BACKGROUND_TASK_MAX_ITEMS)

}



const isBackgroundTaskRunning = (status) => {

  return BACKGROUND_RUNNING_STATUS_SET.has(String(status || '').toLowerCase())

}



export default function ChaoxingSignin() {

  const navigate = useNavigate()

  const pollRef = useRef(null)

  const autoCheckRef = useRef(null)

  const redirectingRef = useRef(false)

  const autoSigningRef = useRef(false)

  const autoSignedTaskCacheRef = useRef(new Map())



  const [submitting, setSubmitting] = useState(false)

  const [statusLoading, setStatusLoading] = useState(false)

  const [taskId, setTaskId] = useState('')

  const [taskStatus, setTaskStatus] = useState(null)

  const [logs, setLogs] = useState([])

  const [resultMessage, setResultMessage] = useState('')

  const [resultType, setResultType] = useState('info')

  const [activeTab, setActiveTab] = useState('signin')

  const [courses, setCourses] = useState([])

  const [signinTasks, setSigninTasks] = useState([])

  const [signinHistory, setSigninHistory] = useState([])

  const [backgroundTaskHistory, setBackgroundTaskHistory] = useState([])

  const [autoSignin, setAutoSignin] = useState(false)

  const [autoSignFilter, setAutoSignFilter] = useState('all')

  const [checkInterval, setCheckInterval] = useState(DEFAULT_CHECK_INTERVAL_MINUTES)

  const [nextCheckCountdown, setNextCheckCountdown] = useState(0)

  const [todayStats, setTodayStats] = useState({ total: 0, success: 0, failed: 0 })

  const [form, setForm] = useState({

    username: '',

    password: '',

    selectedCourseIds: [],

    signType: 'all',

    latitude: '',

    longitude: '',

    address: '',

    altitude: '100',

    photoFile: null,

    qrCode: '',

    signCode: '',

    gesturePattern: ''

  })



  useEffect(() => {

    try {

      const raw = localStorage.getItem(CHAOXING_SETTINGS_KEY)

      if (!raw) return

      const parsed = JSON.parse(raw)

      if (typeof parsed.autoSignin === 'boolean') {

        setAutoSignin(parsed.autoSignin)

      }

      if (typeof parsed.autoSignFilter === 'string' && parsed.autoSignFilter) {

        setAutoSignFilter(parsed.autoSignFilter)

      }

      if (parsed.checkInterval !== undefined && parsed.checkInterval !== null) {

        setCheckInterval(clampCheckInterval(parsed.checkInterval))

      }

    } catch (err) {

      console.warn('Failed to load chaoxing settings:', err)

    }

  }, [])



  useEffect(() => {

    try {

      localStorage.setItem(

        CHAOXING_SETTINGS_KEY,

        JSON.stringify({

          autoSignin,

          autoSignFilter,

          checkInterval: clampCheckInterval(checkInterval)

        })

      )

    } catch (err) {

      console.warn('Failed to save chaoxing settings:', err)

    }

  }, [autoSignin, autoSignFilter, checkInterval])



  const stopPolling = useCallback(() => {

    if (pollRef.current) {

      clearInterval(pollRef.current)

      pollRef.current = null

    }

  }, [])



  const stopAutoCheck = useCallback(() => {

    if (autoCheckRef.current) {

      clearInterval(autoCheckRef.current)

      autoCheckRef.current = null

    }

    setNextCheckCountdown(0)

  }, [])



  const ensureAccessToken = useCallback(() => {

    return getToken() || null

  }, [])



  const redirectToLogin = useCallback((message = '登录已过期，请重新登录。') => {

    if (!redirectingRef.current) {

      redirectingRef.current = true

      removeToken()

      navigate('/login', { replace: true })

    }

    throw new Error(message)

  }, [navigate])



  const requestChaoxingApi = useCallback(

    async (path, body, options = {}) => {

      if (redirectingRef.current) {

        throw new Error('正在跳转到登录页...')

      }

      const token = ensureAccessToken()

      if (!token) {

        redirectToLogin('登录态失效，请重新登录。')

      }



      const hasBody = body !== undefined && body !== null

      const isFormData = body instanceof FormData

      const method = options.method || (hasBody ? 'POST' : 'GET')

      const headers = {

        ...(options.headers || {}),

        Authorization: `Bearer ${token}`

      }



      if (hasBody && !isFormData && !headers['Content-Type']) {

        headers['Content-Type'] = 'application/json'

      }



      const response = await fetch(`${CHAOXING_API_BASE}${path}`, {

        ...options,

        method,

        headers,

        body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined

      })



      const payload = await parsePayload(response)

      const message = pickMessage(payload)

      const code = payload?.code || payload?.error_code

      const isAuthFailure =

        response.status === 401 ||

        response.status === 403 ||

        code === 'AUTH_TOKEN_EXPIRED' ||

        code === 'AUTH_INVALID_TOKEN' ||

        (response.status === 200 && payload?.status === false && TOKEN_ERROR_PATTERN.test(message || ''))

      if (isAuthFailure) {

        redirectToLogin('登录已过期，请重新登录。')

      }

      if (!response.ok) {

        throw new Error(message || `请求失败（${response.status}）`)

      }

      if (payload?.status === false) {

        throw new Error(message || '请求失败')

      }

      return payload

    },

    [ensureAccessToken, redirectToLogin]

  )






  const fetchCourses = useCallback(async () => {

    try {

      const resp = await requestChaoxingApi('/courses')

      setCourses(resp?.data || [])

    } catch (err) {

      if (!redirectingRef.current) {

        console.error('Failed to fetch courses:', err)

      }

    }

  }, [requestChaoxingApi])



  const fetchSigninTasks = useCallback(async () => {

    try {

      const resp = await requestChaoxingApi('/tasks')

      setSigninTasks(resp?.data || [])

    } catch (err) {

      if (!redirectingRef.current) {

        console.error('Failed to fetch signin tasks:', err)

      }

    }

  }, [requestChaoxingApi])



  const fetchSigninHistory = useCallback(async () => {

    try {

      const resp = await requestChaoxingApi('/history')

      setSigninHistory(resp?.data || [])



      const today = new Date().toDateString()

      const todayRecords = (resp?.data || []).filter(r => new Date(r.timestamp).toDateString() === today)

      setTodayStats({

        total: todayRecords.length,

        success: todayRecords.filter(r => r.status === 'success').length,

        failed: todayRecords.filter(r => r.status === 'failed').length

      })

    } catch (err) {

      if (!redirectingRef.current) {

        console.error('Failed to fetch signin history:', err)

      }

    }

  }, [requestChaoxingApi])



  const fetchBackgroundTaskHistory = useCallback(async () => {

    try {

      const resp = await requestChaoxingApi('/task-list')

      const normalizedTasks = normalizeBackgroundTaskHistory(resp)

      setBackgroundTaskHistory(normalizedTasks)

      return normalizedTasks

    } catch (err) {

      if (!redirectingRef.current) {

        console.error('Failed to fetch background tasks:', err)

      }

      return []

    }

  }, [requestChaoxingApi])



  const buildSigninPayload = useCallback((courseId = null, signTypeOverride = null) => {

    const signType = signTypeOverride || form.signType

    const payload = {

      username: form.username.trim(),

      password: form.password,

      sign_type: normalizeSignTypeForApi(signType),

      course_id: courseId

    }



    if (shouldUseLocationParams(signType)) {

      if (form.latitude) payload.latitude = form.latitude

      if (form.longitude) payload.longitude = form.longitude

      if (form.address) payload.address = form.address

      if (form.altitude !== '') payload.altitude = form.altitude

    }



    if (signType === 'qrcode' && form.qrCode.trim()) {

      payload.qr_code = form.qrCode.trim()

    }

    if (signType === 'code' && form.signCode.trim()) {

      payload.sign_code = form.signCode.trim()

    }

    if (signType === 'gesture' && form.gesturePattern.trim()) {

      payload.gesture = form.gesturePattern.trim()

    }



    return { payload, signType }

  }, [form])



  const executeSignin = useCallback(async (courseId = null, signTypeOverride = null, options = {}) => {

    const silent = Boolean(options.silent)

    if (!silent) {

      setSubmitting(true)

      setResultMessage('')

    }



    try {

      const username = form.username.trim()

      if (!username || !form.password) {

        throw new Error('请输入账号和密码。')

      }



      const { payload, signType } = buildSigninPayload(courseId, signTypeOverride)

      let resp



      if (signType === 'photo') {

        if (!form.photoFile) {

          throw new Error('拍照签到需要先上传图片。')

        }

        const formData = new FormData()

        appendPayloadToFormData(formData, payload)

        formData.append('photo', form.photoFile)

        resp = await requestChaoxingApi('/sign', formData)

      } else {

        if (signType === 'qrcode' && !payload.qr_code) {

          throw new Error('二维码签到需要填写二维码内容。')

        }

        resp = await requestChaoxingApi('/sign', payload)

      }



      const message = pickMessage(resp) || '签到成功。'

      if (!silent) {

        setResultType('success')

        setResultMessage(message)

      }

      await fetchSigninHistory()

      return { status: true, message }

    } catch (err) {

      const message = err.message || '签到失败。'

      if (!silent) {

        setResultType('error')

        setResultMessage(message)

      }

      return { status: false, message }

    } finally {

      if (!silent) {

        setSubmitting(false)

      }

    }

  }, [buildSigninPayload, fetchSigninHistory, form.password, form.photoFile, form.username, requestChaoxingApi])



  const runAutoSigninCycle = useCallback(async () => {

    if (autoSigningRef.current || redirectingRef.current || !autoSignin) return



    const username = form.username.trim()

    const password = form.password

    if (!username || !password) {

      setResultType('error')

      setResultMessage('自动签到已开启，但账号或密码为空。')

      return

    }



    autoSigningRef.current = true

    try {

      const resp = await requestChaoxingApi('/tasks')

      const pendingTasks = Array.isArray(resp?.data) ? resp.data : []

      setSigninTasks(pendingTasks)



      const filteredTasks = pendingTasks.filter((task) => {

        if (task?.actionable === false || task?.source === 'background') return false

        const taskType = String(task?.type || 'normal')

        if (autoSignFilter === 'all') return true

        if (autoSignFilter === 'gesture' || autoSignFilter === 'code') {

          return taskType === 'normal'

        }

        return taskType === autoSignFilter

      })



      if (filteredTasks.length === 0) return



      const now = Date.now()

      let successCount = 0



      for (const task of filteredTasks) {

        const taskType = String(task?.type || 'normal')

        const taskKey = `${task?.taskId || task?.activeId || task?.courseId || task?.courseName || 'task'}:${taskType}`

        const lastTriedAt = autoSignedTaskCacheRef.current.get(taskKey) || 0

        if (now - lastTriedAt < AUTO_SIGN_TASK_COOLDOWN_MS) continue

        autoSignedTaskCacheRef.current.set(taskKey, now)



        const result = await executeSignin(task?.courseId || null, taskType, { silent: true })

        if (result.status) {

          successCount += 1

        }

      }



      if (successCount > 0) {

        setResultType('success')

        setResultMessage(`自动签到完成，成功处理 ${successCount} 个任务。`)

      }

    } catch (err) {

      setResultType('error')

      setResultMessage(err.message || '自动签到检查失败。')

    } finally {

      autoSigningRef.current = false

    }

  }, [autoSignin, autoSignFilter, executeSignin, form.password, form.username, requestChaoxingApi])



  const refreshTaskStatus = useCallback(async (currentTaskId = taskId) => {

    if (!currentTaskId) return

    setStatusLoading(true)



    try {

      const [statusResp, logsResp] = await Promise.all([

        requestChaoxingApi(`/task/${currentTaskId}`),

        requestChaoxingApi(`/logs/${currentTaskId}`)

      ])



      const statusData = statusResp?.data || {}

      setTaskStatus(statusData)

      setBackgroundTaskHistory((prev) =>

        upsertBackgroundTaskHistory(prev, {

          ...statusData,

          task_id: currentTaskId

        })

      )

      if (Array.isArray(logsResp?.data) && logsResp.data.length > 0) {

        setLogs((prev) => [...prev, ...logsResp.data].slice(-200))

      }



      if (statusData.status === 'completed' || statusData.status === 'error') {

        stopPolling()

      }

    } catch (err) {

      setResultType('error')

      setResultMessage(err.message || '查询任务状态失败。')

      stopPolling()

    } finally {

      setStatusLoading(false)

    }

  }, [requestChaoxingApi, stopPolling, taskId])



  const openBackgroundTask = useCallback(async (nextTaskId) => {

    const normalizedTaskId = String(nextTaskId || '').trim()

    if (!normalizedTaskId) return false

    setTaskId(normalizedTaskId)

    setTaskStatus(null)

    setLogs([])

    await refreshTaskStatus(normalizedTaskId)

    return true

  }, [refreshTaskStatus])



  useEffect(() => {

    if (!isAuthenticated()) {

      navigate('/login', { replace: true })

      return undefined

    }



    redirectingRef.current = false

    let cancelled = false

    const bootstrap = async () => {

      const token = ensureAccessToken()

      if (cancelled) return

      if (!token) {

        navigate('/login', { replace: true })

        return

      }

      const results = await Promise.allSettled([

        fetchCourses(),

        fetchSigninTasks(),

        fetchSigninHistory(),

        fetchBackgroundTaskHistory()

      ])

      if (cancelled) return

      const backgroundTasksResult = results[3]

      if (backgroundTasksResult.status !== 'fulfilled') return

      const backgroundTasks = Array.isArray(backgroundTasksResult.value) ? backgroundTasksResult.value : []

      if (backgroundTasks.length === 0) return

      const runningTask = backgroundTasks.find((task) => isBackgroundTaskRunning(task.status))

      const latestTask = runningTask || backgroundTasks[0]

      if (latestTask?.taskId) {

        await openBackgroundTask(latestTask.taskId)

      }

    }



    bootstrap()



    return () => {

      cancelled = true

      stopPolling()

      stopAutoCheck()

    }

  }, [ensureAccessToken, navigate, stopPolling, stopAutoCheck, fetchCourses, fetchSigninTasks, fetchSigninHistory, fetchBackgroundTaskHistory, openBackgroundTask])



  useEffect(() => {

    if (!autoSignin) {

      stopAutoCheck()

      return undefined

    }



    const normalizedInterval = clampCheckInterval(checkInterval)

    if (normalizedInterval !== checkInterval) {

      setCheckInterval(normalizedInterval)

      return undefined

    }



    const intervalMs = normalizedInterval * 60 * 1000

    setNextCheckCountdown(normalizedInterval * 60)



    void runAutoSigninCycle()



    const countdownInterval = setInterval(() => {

      setNextCheckCountdown(prev => Math.max(0, prev - 1))

    }, 1000)



    autoCheckRef.current = setInterval(() => {

      void runAutoSigninCycle()

      setNextCheckCountdown(normalizedInterval * 60)

    }, intervalMs)



    return () => {

      clearInterval(countdownInterval)

      stopAutoCheck()

    }

  }, [autoSignin, checkInterval, runAutoSigninCycle, stopAutoCheck])



  useEffect(() => {

    if (!taskId) return undefined

    stopPolling()

    pollRef.current = setInterval(() => {

      refreshTaskStatus()

    }, POLL_INTERVAL_MS)

    return stopPolling

  }, [refreshTaskStatus, stopPolling, taskId])



  const courseOptions = useMemo(() => {

    const source = Array.isArray(courses) ? courses : []

    const seen = new Set()

    const options = []



    source.forEach((course, index) => {

      const id = buildCourseSelector(course)

      if (!id || seen.has(id)) return

      seen.add(id)

      options.push({

        id,

        name: getCourseDisplayName(course, `课程 ${index + 1}`)

      })

    })



    return options

  }, [courses])



  useEffect(() => {

    setForm((prev) => {

      if (!Array.isArray(prev.selectedCourseIds) || prev.selectedCourseIds.length === 0) {

        return prev

      }

      const validIds = new Set(courseOptions.map((course) => course.id))

      const nextSelected = prev.selectedCourseIds.filter((id) => validIds.has(id))

      const unchanged =

        nextSelected.length === prev.selectedCourseIds.length &&

        nextSelected.every((id, index) => id === prev.selectedCourseIds[index])

      if (unchanged) return prev

      return { ...prev, selectedCourseIds: nextSelected }

    })

  }, [courseOptions])



  const verifyAccount = async (event) => {

    event.preventDefault()

    if (submitting) return



    const username = form.username.trim()

    const password = form.password

    if (!username || !password) {

      setResultType('error')

      setResultMessage('请输入账号和密码。')

      return

    }



    setSubmitting(true)

    setResultMessage('')



    try {

      const resp = await requestChaoxingApi('/login', {

        username,

        password,

        use_cookies: false

      })

      setResultType('success')

      setResultMessage(pickMessage(resp) || '账号验证成功。')

    } catch (err) {

      setResultType('error')

      setResultMessage(err.message || '账号验证失败。')

    } finally {

      setSubmitting(false)

    }

  }



  const startSigninTask = async () => {

    if (submitting) return



    const username = form.username.trim()

    const password = form.password

    if (!username || !password) {

      setResultType('error')

      setResultMessage('请输入账号和密码。')

      return

    }



    setSubmitting(true)

    setResultMessage('')

    setLogs([])

    setTaskStatus(null)

    setTaskId('')



    try {

      const selectedCourseOptions = form.selectedCourseIds
        .map((id) => courseOptions.find((course) => course.id === id))
        .filter(Boolean)
      const selectedCourseNames = selectedCourseOptions.map((course) => course.name).filter(Boolean)

      if (form.selectedCourseIds.length > 0 && selectedCourseOptions.length !== form.selectedCourseIds.length) {
        throw new Error('选中的课程无效，请重新选择后再试。')
      }

      const payload = {
        username,
        password,
        course_list: selectedCourseOptions.map((course) => course.id),

        speed: 1,

        jobs: 1,

        sign_type: normalizeSignTypeForApi(form.signType),

        notopen_action: 'retry',

        tiku_config: {},

        notification_config: {},

        ocr_config: {}

      }



      const { payload: signPayload, signType } = buildSigninPayload(null, form.signType)

      if (signPayload.latitude !== undefined) payload.latitude = signPayload.latitude

      if (signPayload.longitude !== undefined) payload.longitude = signPayload.longitude

      if (signPayload.address !== undefined) payload.address = signPayload.address

      if (signPayload.altitude !== undefined) payload.altitude = signPayload.altitude

      if (signPayload.qr_code !== undefined) payload.qr_code = signPayload.qr_code

      if (signPayload.sign_code !== undefined) payload.sign_code = signPayload.sign_code

      if (signPayload.gesture !== undefined) payload.gesture = signPayload.gesture



      let resp

      if (signType === 'photo') {

        if (!form.photoFile) {

          throw new Error('拍照签到任务需要先上传图片。')

        }

        const formData = new FormData()

        appendPayloadToFormData(formData, payload)

        formData.append('photo', form.photoFile)

        resp = await requestChaoxingApi('/start', formData)

      } else {

        resp = await requestChaoxingApi('/start', payload)

      }



      const nextTaskId = resp?.data?.task_id

      if (!nextTaskId) {

        throw new Error('服务端未返回任务 ID。')

      }

      setResultType('success')

      setResultMessage(`签到任务已启动：${nextTaskId}`)

      setBackgroundTaskHistory((prev) =>

        upsertBackgroundTaskHistory(prev, {

          task_id: nextTaskId,

          status: 'running',

          message: pickMessage(resp) || '签到任务已启动。',

          courseName: selectedCourseNames.join('、') || '后台签到任务',

          created_at: new Date().toISOString(),

          updated_at: new Date().toISOString()

        })

      )

      await openBackgroundTask(nextTaskId)

      void fetchBackgroundTaskHistory()

    } catch (err) {

      setResultType('error')

      setResultMessage(err.message || '启动签到任务失败。')

    } finally {

      setSubmitting(false)

    }

  }



  const taskPretty = useMemo(() => {

    if (!taskStatus) return ''

    try {

      return JSON.stringify(taskStatus, null, 2)

    } catch (_) {

      return String(taskStatus)

    }

  }, [taskStatus])



  const getSignTypeIcon = (type) => {

    switch (type) {

      case 'photo': return <Camera className="h-5 w-5" />

      case 'location': return <MapPin className="h-5 w-5" />

      case 'qrcode': return <QrCode className="h-5 w-5" />

      default: return <CheckSquare className="h-5 w-5" />

    }

  }



  const formatCountdown = (seconds) => {

    const mins = Math.floor(seconds / 60)

    const secs = seconds % 60

    return `${mins}:${secs.toString().padStart(2, '0')}`

  }



  return (

    <div className="min-h-screen overflow-x-hidden bg-background p-4 md:p-6">

      <main className="mx-auto max-w-7xl space-y-6">

        <div className={GLASS_CARD_CLASS}>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold text-text">学习通签到</h1>

              <p className="text-sm text-text/70">完整签到功能与实时监控。</p>

            </div>

            <Button

              type="button"

              variant="secondary"

              className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

              onClick={() => navigate('/dashboard')}

            >

              返回

            </Button>

          </div>

        </div>



        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          <div className={GLASS_CARD_CLASS}>

            <div className="flex items-center gap-3">

              <CheckCircle2 className="h-8 w-8 text-green-600" />

              <div>

                <p className="text-sm text-text/70">今日成功</p>

                <p className="text-2xl font-bold text-text">{todayStats.success}</p>

              </div>

            </div>

          </div>

          <div className={GLASS_CARD_CLASS}>

            <div className="flex items-center gap-3">

              <AlertCircle className="h-8 w-8 text-red-600" />

              <div>

                <p className="text-sm text-text/70">今日失败</p>

                <p className="text-2xl font-bold text-text">{todayStats.failed}</p>

              </div>

            </div>

          </div>

          <div className={GLASS_CARD_CLASS}>

            <div className="flex items-center gap-3">

              <TrendingUp className="h-8 w-8 text-blue-600" />

              <div>

                <p className="text-sm text-text/70">成功率</p>

                <p className="text-2xl font-bold text-text">

                  {todayStats.total > 0 ? Math.round((todayStats.success / todayStats.total) * 100) : 0}%

                </p>

              </div>

            </div>

          </div>

        </div>



        <div className={GLASS_CARD_CLASS}>

          <div className="flex flex-wrap gap-2 border-b border-white/20 pb-4">

            <button

              onClick={() => setActiveTab('signin')}

              className={`min-h-[44px] rounded-xl px-4 py-2 font-medium transition-all duration-200 cursor-pointer ${

                activeTab === 'signin'

                  ? 'bg-primary text-white'

                  : 'bg-white/60 text-text hover:bg-white/80'

              }`}

            >

              签到

            </button>

            <button

              onClick={() => setActiveTab('tasks')}

              className={`min-h-[44px] rounded-xl px-4 py-2 font-medium transition-all duration-200 cursor-pointer ${

                activeTab === 'tasks'

                  ? 'bg-primary text-white'

                  : 'bg-white/60 text-text hover:bg-white/80'

              }`}

            >

              任务

            </button>

            <button

              onClick={() => setActiveTab('history')}

              className={`min-h-[44px] rounded-xl px-4 py-2 font-medium transition-all duration-200 cursor-pointer ${

                activeTab === 'history'

                  ? 'bg-primary text-white'

                  : 'bg-white/60 text-text hover:bg-white/80'

              }`}

            >

              历史

            </button>

            <button

              onClick={() => setActiveTab('config')}

              className={`min-h-[44px] rounded-xl px-4 py-2 font-medium transition-all duration-200 cursor-pointer ${

                activeTab === 'config'

                  ? 'bg-primary text-white'

                  : 'bg-white/60 text-text hover:bg-white/80'

              }`}

            >

              设置

            </button>

          </div>



          {activeTab === 'signin' && (

            <div className="mt-6 space-y-4">

              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={verifyAccount}>

            <Input

              id="cx-username"

              label="账号 / 手机号"

              type="text"

              value={form.username}

              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}

              required

            />

            <Input

              id="cx-password"

              label="密码"

              type="password"

              value={form.password}

              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}

              required

            />

            <div className="md:col-span-2">

              <label htmlFor="cx-signtype" className="mb-2 block text-sm font-medium text-text">

                签到类型

              </label>

              <select

                id="cx-signtype"

                value={form.signType}

                onChange={(event) => setForm((prev) => ({ ...prev, signType: event.target.value }))}

                className="w-full min-h-[44px] rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-text backdrop-blur-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"

              >

                <option value="all">全部类型</option>

                <option value="normal">普通签到</option>

                <option value="photo">拍照签到</option>

                <option value="location">位置签到</option>

                <option value="qrcode">二维码签到</option>

                <option value="gesture">手势签到</option>

                <option value="code">签到码签到</option>

              </select>

            </div>

            <div className="md:col-span-2">

              <div className="mb-2 flex items-center justify-between gap-2">

                <label htmlFor="cx-courselist" className="block text-sm font-medium text-text">

                  课程选择（可选，不选即全部课程）

                </label>

                <Button

                  type="button"

                  variant="secondary"

                  className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                  onClick={fetchCourses}

                >

                  <RefreshCw className="h-4 w-4" />

                </Button>

              </div>

              <select

                id="cx-courselist"

                multiple

                value={form.selectedCourseIds}

                onChange={(event) => {

                  const nextSelected = Array.from(event.target.selectedOptions).map((option) => option.value)

                  setForm((prev) => ({ ...prev, selectedCourseIds: nextSelected }))

                }}

                className="w-full min-h-[180px] rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-text backdrop-blur-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"

              >

                {courseOptions.length === 0 ? (

                  <option value="" disabled>暂无课程，请先验证账号后刷新课程</option>

                ) : (

                  courseOptions.map((course) => (

                    <option key={course.id} value={course.id}>

                      {course.name}

                    </option>

                  ))

                )}

              </select>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <Button

                  type="button"

                  variant="secondary"

                  className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                  onClick={() => {

                    setForm((prev) => ({ ...prev, selectedCourseIds: courseOptions.map((course) => course.id) }))

                  }}

                  disabled={courseOptions.length === 0}

                >

                  全选

                </Button>

                <Button

                  type="button"

                  variant="secondary"

                  className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                  onClick={() => {

                    setForm((prev) => ({ ...prev, selectedCourseIds: [] }))

                  }}

                >

                  清空

                </Button>

                <p className="text-xs text-text/70">

                  已选 {form.selectedCourseIds.length} 门，已加载 {courseOptions.length} 门课程

                </p>

              </div>

            </div>

                {form.signType === 'photo' && (

                  <div className="md:col-span-2">

                    <label htmlFor="cx-photo" className="mb-2 block text-sm font-medium text-text">

                      签到图片

                    </label>

                    <input

                      id="cx-photo"

                      type="file"

                      accept="image/*"

                      onChange={(event) => setForm((prev) => ({ ...prev, photoFile: event.target.files?.[0] || null }))}

                      className="w-full min-h-[44px] rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-text backdrop-blur-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"

                    />

                    <p className="mt-2 text-xs text-text/70">

                      {form.photoFile ? `已选择：${form.photoFile.name}` : '请上传签到图片。'}

                    </p>

                  </div>

                )}

                {(form.signType === 'location' || form.signType === 'qrcode') && (

                  <>

                    <Input

                      id="cx-latitude"

                      label="纬度"

                      type="text"

                      value={form.latitude}

                      onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}

                      placeholder="e.g. 39.9042"

                    />

                    <Input

                      id="cx-longitude"

                      label="经度"

                      type="text"

                      value={form.longitude}

                      onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}

                      placeholder="e.g. 116.4074"

                    />

                    <div className="md:col-span-2">

                      <Input

                        id="cx-address"

                        label="地址"

                        type="text"

                        value={form.address}

                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}

                        placeholder="e.g. Chaoyang District, Beijing"

                      />

                    </div>

                    <Input

                      id="cx-altitude"

                      label="海拔（米）"

                      type="number"

                      step="0.1"

                      value={form.altitude}

                      onChange={(e) => setForm((prev) => ({ ...prev, altitude: e.target.value }))}

                      placeholder="默认 100"

                    />

                  </>

                )}

                {form.signType === 'qrcode' && (

                  <div className="md:col-span-2">

                    <Input

                      id="cx-qrcode"

                      label="二维码内容"

                      type="text"

                      value={form.qrCode}

                      onChange={(e) => setForm((prev) => ({ ...prev, qrCode: e.target.value }))}

                      placeholder="请输入二维码内容或扫码文本"

                    />

                    <p className="mt-2 text-xs text-text/70">

                      二维码签到可附带经纬度、地址和海拔参数以提高成功率。

                    </p>

                  </div>

                )}

                {form.signType === 'gesture' && (

                  <div className="md:col-span-2">

                    <Input

                      id="cx-gesture"

                      label="手势标识（可选）"

                      type="text"

                      value={form.gesturePattern}

                      onChange={(e) => setForm((prev) => ({ ...prev, gesturePattern: e.target.value }))}

                      placeholder="例如：上右下左（后端兼容按普通签到处理）"

                    />

                  </div>

                )}

                {form.signType === 'code' && (

                  <div className="md:col-span-2">

                    <Input

                      id="cx-sign-code"

                      label="签到码"

                      type="text"

                      value={form.signCode}

                      onChange={(e) => setForm((prev) => ({ ...prev, signCode: e.target.value }))}

                      placeholder="请输入老师发布的签到码（后端兼容按普通签到处理）"

                    />

                  </div>

                )}

                <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  <Button

                    type="submit"

                    variant="secondary"

                    className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"

                    disabled={submitting}

                  >

                    {submitting ? '验证中...' : '验证账号'}

                  </Button>

                  <Button

                    type="button"

                    className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"

                    onClick={() => executeSignin()}

                    disabled={submitting}

                  >

                    {submitting ? '签到中...' : '一键签到'}

                  </Button>

                  <Button

                    type="button"

                    variant="cta"

                    className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"

                    onClick={startSigninTask}

                    disabled={submitting}

                  >

                    {submitting ? '处理中...' : '启动任务'}

                  </Button>

                  <Button

                    type="button"

                    variant="secondary"

                    className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                    onClick={() => navigate('/chaoxing-fanya')}

                  >

                    打开泛雅页面

                  </Button>

                </div>

              </form>



              {resultMessage && (

                <div

                  className={`mt-4 rounded-xl border p-3 text-sm backdrop-blur-sm transition-all duration-200 ${

                    resultType === 'success'

                      ? 'border-green-500/30 bg-green-50/80 text-green-700'

                      : resultType === 'error'

                        ? 'border-red-500/30 bg-red-50/80 text-red-700'

                        : 'border-primary/20 bg-white/60 text-text'

                  }`}

                >

                  <p className="flex items-center gap-2">

                    {resultType === 'success' ? (

                      <CheckCircle2 className="h-4 w-4" />

                    ) : resultType === 'error' ? (

                      <AlertCircle className="h-4 w-4" />

                    ) : (

                      <Loader2 className="h-4 w-4 animate-spin" />

                    )}

                    {resultMessage}

                  </p>

                </div>

              )}



              {(taskId || taskStatus || logs.length > 0) && (

                <div className={GLASS_PANEL_CLASS}>

                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                    <h3 className="text-base font-semibold text-text">任务状态</h3>

                    <Button

                      type="button"

                      variant="secondary"

                      className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"

                      onClick={() => refreshTaskStatus()}

                      disabled={!taskId || statusLoading}

                    >

                      {statusLoading ? (

                        <span className="inline-flex items-center gap-2">

                          <Loader2 className="h-4 w-4 animate-spin" />

                          刷新中...

                        </span>

                      ) : (

                        <span className="inline-flex items-center gap-2">

                          <RefreshCw className="h-4 w-4" />

                          刷新状态

                        </span>

                      )}

                    </Button>

                  </div>



                  {taskId && (

                    <p className="mb-2 text-sm text-text/80">

                      任务 ID：<span className="font-mono">{taskId}</span>

                    </p>

                  )}

                  {taskStatus && (

                    <pre className="mb-3 max-h-48 overflow-auto rounded-xl border border-white/20 bg-slate-900/90 p-3 text-xs text-slate-100">

                      {taskPretty}

                    </pre>

                  )}



                  <div>

                    <p className="mb-2 text-sm font-medium text-text">实时日志</p>

                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/20 bg-slate-900/90 p-3 font-mono text-xs text-slate-100">

                      {logs.length === 0 ? (

                        <p className="text-slate-300">暂无日志</p>

                      ) : (

                        logs.map((log, index) => {

                          const message = typeof log === 'string' ? log : (log?.message || safeStringify(log))

                          const timestamp = typeof log === 'object' && log?.timestamp ? String(log.timestamp) : ''

                          return (

                            <p key={`${timestamp}-${index}`} className="break-all">

                              {timestamp ? `[${timestamp}] ` : ''}{message}

                            </p>

                          )

                        })

                      )}

                    </div>

                  </div>

                </div>

              )}



              <div className={GLASS_PANEL_CLASS}>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                  <h3 className="text-base font-semibold text-text">后台任务历史</h3>

                  <Button

                    type="button"

                    variant="secondary"

                    className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                    onClick={() => {

                      void fetchBackgroundTaskHistory()

                    }}

                  >

                    <RefreshCw className="h-4 w-4" />

                  </Button>

                </div>

                {backgroundTaskHistory.length === 0 ? (

                  <p className="text-sm text-text/70">暂无后台任务历史</p>

                ) : (

                  <div className="max-h-64 space-y-2 overflow-y-auto">

                    {backgroundTaskHistory.map((task) => {

                      const isActive = task.taskId === taskId

                      const statusClassName = task.status === 'completed'

                        ? 'border-green-300 bg-green-50 text-green-700'

                        : task.status === 'error'

                          ? 'border-red-300 bg-red-50 text-red-700'

                          : 'border-amber-300 bg-amber-50 text-amber-700'

                      return (

                        <button

                          key={task.taskId}

                          type="button"

                          className={`w-full min-h-[44px] rounded-xl border px-3 py-3 text-left transition-all duration-200 cursor-pointer ${isActive ? 'border-primary/50 bg-primary/10' : 'border-white/30 bg-white/70 hover:border-primary/40'}`}

                          onClick={() => {

                            void openBackgroundTask(task.taskId)

                          }}

                        >

                          <div className="flex flex-wrap items-start justify-between gap-2">

                            <div className="min-w-0 flex-1">

                              <p className="font-medium text-text">{task.courseName || '后台签到任务'}</p>

                              <p className="mt-1 break-all font-mono text-xs text-text/70">任务 ID：{task.taskId}</p>

                            </div>

                            <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClassName}`}>

                              {task.status || 'unknown'}

                            </span>

                          </div>

                          <p className="mt-2 text-sm text-text/80">{task.message || '暂无消息'}</p>

                          <p className="mt-1 text-xs text-text/60">

                            更新时间：{parseTaskTimestamp(task.updatedAt || task.createdAt) > 0 ? new Date(task.updatedAt || task.createdAt).toLocaleString() : '--'}

                          </p>

                        </button>

                      )

                    })}

                  </div>

                )}

              </div>

            </div>

          )}



          {activeTab === 'tasks' && (

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between">

                <h3 className="text-lg font-bold text-text">签到任务列表</h3>

                <Button

                  type="button"

                  variant="secondary"

                  className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                  onClick={fetchSigninTasks}

                >

                  <RefreshCw className="h-4 w-4" />

                </Button>

              </div>

              {signinTasks.length === 0 ? (

                <p className="text-center text-text/70 py-8">暂无签到任务</p>

              ) : (

                <div className="space-y-3">

                  {signinTasks.map((task, idx) => {

                    const isBackgroundTask = task?.actionable === false || task?.source === 'background'

                    const backgroundTaskId = String(task?.taskId || task?.task_id || '').trim()

                    const taskType = String(task?.type || 'normal')

                    const taskTypeLabel = String(task?.typeLabel || taskType || 'normal')

                    const taskMessage = String(task?.message || '')

                    const taskStatus = String(task?.status || '').toLowerCase()

                    return (

                    <div

                      key={idx}

                      className={`${GLASS_PANEL_CLASS} ${isBackgroundTask && backgroundTaskId ? 'cursor-pointer transition-all duration-200 hover:border-primary/40' : ''}`}

                      role={isBackgroundTask && backgroundTaskId ? 'button' : undefined}

                      tabIndex={isBackgroundTask && backgroundTaskId ? 0 : undefined}

                      onClick={() => {

                        if (isBackgroundTask && backgroundTaskId) {

                          void openBackgroundTask(backgroundTaskId)

                        }

                      }}

                      onKeyDown={(event) => {

                        if (!isBackgroundTask || !backgroundTaskId) return

                        if (event.key === 'Enter' || event.key === ' ') {

                          event.preventDefault()

                          void openBackgroundTask(backgroundTaskId)

                        }

                      }}

                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex items-start gap-3 flex-1">

                          <div className="mt-1">{getSignTypeIcon(taskType)}</div>

                          <div className="flex-1">

                            <h4 className="font-medium text-text">{task.courseName || (isBackgroundTask ? '后台签到任务' : '待处理签到任务')}</h4>

                            <p className="text-sm text-text/70 mt-1">签到类型：{taskTypeLabel}</p>

                            {taskMessage && (

                              <p className="text-sm text-text/70 mt-1">{taskMessage}</p>

                            )}

                            {isBackgroundTask && taskStatus && (

                              <p className="text-sm text-text/70 mt-1">任务状态：{taskStatus}</p>

                            )}

                            {task.deadline && (

                              <p className="text-sm text-text/70 flex items-center gap-1 mt-1">

                                <Clock className="h-3 w-3" />

                                截止时间：{new Date(task.deadline).toLocaleString()}

                              </p>

                            )}

                          </div>

                        </div>

                        <Button

                          type="button"

                          disabled={isBackgroundTask && !backgroundTaskId}

                          className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                          onClick={(event) => {

                            event.stopPropagation()

                            if (isBackgroundTask) {

                              if (backgroundTaskId) {

                                void openBackgroundTask(backgroundTaskId)

                              }

                              return

                            }

                            void executeSignin(task.courseId, taskType)

                          }}

                        >

                          {isBackgroundTask ? '查看详情' : '执行签到'}

                        </Button>

                      </div>

                    </div>

                    )})}

                </div>

              )}

            </div>

          )}



          {activeTab === 'history' && (

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between">

                <h3 className="text-lg font-bold text-text">签到历史</h3>

                <Button

                  type="button"

                  variant="secondary"

                  className="min-h-[44px] min-w-[44px] cursor-pointer transition-all duration-200 hover:scale-105"

                  onClick={fetchSigninHistory}

                >

                  <RefreshCw className="h-4 w-4" />

                </Button>

              </div>

              {signinHistory.length === 0 ? (

                <p className="text-center text-text/70 py-8">暂无签到历史</p>

              ) : (

                <div className="space-y-3">

                  {signinHistory.map((record, idx) => (

                    <div

                      key={idx}

                      className={`${GLASS_PANEL_CLASS} ${isBackgroundTask && backgroundTaskId ? 'cursor-pointer transition-all duration-200 hover:border-primary/40' : ''}`}

                      role={isBackgroundTask && backgroundTaskId ? 'button' : undefined}

                      tabIndex={isBackgroundTask && backgroundTaskId ? 0 : undefined}

                      onClick={() => {

                        if (isBackgroundTask && backgroundTaskId) {

                          void openBackgroundTask(backgroundTaskId)

                        }

                      }}

                      onKeyDown={(event) => {

                        if (!isBackgroundTask || !backgroundTaskId) return

                        if (event.key === 'Enter' || event.key === ' ') {

                          event.preventDefault()

                          void openBackgroundTask(backgroundTaskId)

                        }

                      }}

                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex items-start gap-3 flex-1">

                          <div className="mt-1">

                            {record.status === 'success' ? (

                              <CheckCircle2 className="h-5 w-5 text-green-600" />

                            ) : (

                              <AlertCircle className="h-5 w-5 text-red-600" />

                            )}

                          </div>

                          <div className="flex-1">

                            <h4 className="font-medium text-text">{record.courseName}</h4>

                            <p className="text-sm text-text/70 mt-1">{record.message}</p>

                            <p className="text-xs text-text/60 mt-1">

                              {new Date(record.timestamp).toLocaleString()}

                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          )}



          {activeTab === 'config' && (

            <div className="mt-6 space-y-6">

              <div>

                <h3 className="text-lg font-bold text-text mb-4">自动签到设置</h3>

                <div className="space-y-4">

                  <div className={`${GLASS_PANEL_CLASS} flex items-center justify-between`}>

                    <div>

                      <p className="font-medium text-text">自动签到</p>

                      <p className="text-sm text-text/70">按设定周期自动检查并签到</p>

                    </div>

                    <button

                      onClick={() => setAutoSignin(!autoSignin)}

                      className={`relative inline-flex h-11 w-20 min-h-[44px] min-w-[44px] items-center rounded-full px-1 transition-colors duration-200 cursor-pointer ${

                        autoSignin ? 'bg-primary' : 'bg-gray-300'

                      }`}

                    >

                      <span

                        className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ${

                          autoSignin ? 'translate-x-10' : 'translate-x-1'

                        }`}

                      />

                    </button>

                  </div>



                  <div className={GLASS_PANEL_CLASS}>

                    <label className="block text-sm font-medium text-text mb-2">

                      检查间隔（分钟）

                    </label>

                    <input

                      type="number"

                      min="1"

                      max={String(MAX_CHECK_INTERVAL_MINUTES)}

                      value={checkInterval}

                      onChange={(e) => setCheckInterval(clampCheckInterval(e.target.value))}

                      className="w-full min-h-[44px] rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-text backdrop-blur-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"

                    />

                  </div>



                  <div className={GLASS_PANEL_CLASS}>

                    <label className="block text-sm font-medium text-text mb-2">

                      自动签到类型

                    </label>

                    <select

                      value={autoSignFilter}

                      onChange={(e) => setAutoSignFilter(e.target.value)}

                      className="w-full min-h-[44px] rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-text backdrop-blur-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"

                    >

                      <option value="all">全部类型</option>

                      <option value="normal">普通签到</option>

                      <option value="photo">拍照签到</option>

                      <option value="location">位置签到</option>

                      <option value="qrcode">二维码签到</option>

                      <option value="gesture">手势签到（兼容普通）</option>

                      <option value="code">签到码签到（兼容普通）</option>

                    </select>

                    <p className="mt-2 text-xs text-text/70">

                      设置会自动保存，开启后每次检查将自动尝试签到，重复任务会短时间去重。

                    </p>

                  </div>



                  {autoSignin && nextCheckCountdown > 0 && (

                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 backdrop-blur-sm transition-all duration-200">

                      <p className="text-sm text-text flex items-center gap-2">

                        <Clock className="h-4 w-4" />

                        下次检查：{formatCountdown(nextCheckCountdown)}

                      </p>

                    </div>

                  )}

                </div>

              </div>

            </div>

          )}

        </div>



      </main>

    </div>

  )

}











