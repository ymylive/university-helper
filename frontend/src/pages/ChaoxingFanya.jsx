import { useCallback, useEffect, useMemo, useRef, useState } from 'react'


import { useNavigate } from 'react-router-dom'


import { isAuthenticated, removeToken } from '../utils/auth'


import { api } from '../utils/api'





const TOKEN_ERROR = /(invalid token|token has expired|token validation failed|missing token|invalid authentication credentials)/i


const POLL_MS = 2500


const DONE_STATUSES = new Set(['completed', 'failed', 'error', 'cancelled'])


const RESTORE_STATUSES = new Set(['running', 'pending', 'paused'])


const CARD = 'rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-lg'





const toNum = (value, fallback = 0) => {


  const n = Number(value)


  return Number.isFinite(n) ? n : fallback


}





const toTimestamp = (value) => {


  const ts = new Date(value).getTime()


  return Number.isFinite(ts) ? ts : 0


}





const normalizeCourseText = (value) => {


  if (value === undefined || value === null) return ''


  return String(value).trim()


}





const getCourseId = (course) => {


  const courseId = normalizeCourseText(course?.courseId ?? course?.course_id)


  const classId = normalizeCourseText(course?.classId ?? course?.clazzId ?? course?.class_id ?? course?.clazz_id)


  const cpi = normalizeCourseText(course?.cpi)





  if (courseId && classId) {


    return cpi ? `${courseId}_${classId}_${cpi}` : `${courseId}_${classId}`


  }





  const explicitId = normalizeCourseText(course?.id)


  return explicitId || courseId || classId


}





const getCourseName = (course) => {
  const name = [
    course?.name,
    course?.courseName,
    course?.title,
    course?.course_name,
    course?.courseTitle,
    course?.course_title,
    course?.className,
    course?.clazzName,
    course?.label,
  ]
    .map(normalizeCourseText)
    .find(Boolean)
  const selector = getCourseId(course)
  return name || (selector ? `课程 ${selector}` : '未命名课程')
}






const normalizeTaskItem = (task) => {


  if (!task || typeof task !== 'object') return null


  const taskId = String(task.task_id || task.taskId || task.id || '').trim()


  if (!taskId) return null


  const status = String(task.status || task.task_status || task.state || 'unknown').toLowerCase()


  const updatedAt =


    task.updated_at ||


    task.updatedAt ||


    task.update_time ||


    task.last_update ||


    task.started_at ||


    task.start_time ||


    task.created_at ||


    new Date().toISOString()


  return { ...task, task_id: taskId, status, updated_at: updatedAt }


}





const mergeTaskHistory = (prev, incoming, prepend = false) => {


  const incomingList = (Array.isArray(incoming) ? incoming : [incoming]).map(normalizeTaskItem).filter(Boolean)


  if (incomingList.length === 0) return prev





  const incomingMap = new Map(incomingList.map((item) => [item.task_id, item]))


  const seen = new Set()


  const merged = []


  const push = (item) => {


    if (!item?.task_id || seen.has(item.task_id)) return


    seen.add(item.task_id)


    merged.push(item)


  }





  if (prepend) {


    incomingList.forEach(push)


    prev.forEach((item) => push(incomingMap.get(item.task_id) || item))


    return merged


  }





  prev.forEach((item) => push(incomingMap.get(item.task_id) || item))


  incomingList.forEach(push)


  return merged


}





const formatTaskTime = (value) => {


  if (!value) return '--'


  const date = new Date(value)


  if (Number.isNaN(date.getTime())) return String(value)


  return date.toLocaleString('zh-CN', { hour12: false })


}





export default function ChaoxingFanya() {


  const navigate = useNavigate()


  const pollRef = useRef(null)


  const logCursorRef = useRef(0)





  const [username, setUsername] = useState('')


  const [password, setPassword] = useState('')


  const [courses, setCourses] = useState([])


  const [selectedCourses, setSelectedCourses] = useState([])


  const [chapters, setChapters] = useState({})


  const [expanded, setExpanded] = useState(new Set())





  const [speed, setSpeed] = useState(1.5)


  const [concurrency, setConcurrency] = useState(4)


  const [unopenedStrategy, setUnopenedStrategy] = useState('retry')


  const [tikuProvider, setTikuProvider] = useState('TikuYanxi')


  const [tikuToken, setTikuToken] = useState('')


  const [coverageThreshold, setCoverageThreshold] = useState(0.9)


  const [correctOptions, setCorrectOptions] = useState('对,正确,是')


  const [wrongOptions, setWrongOptions] = useState('错,错误,否')


  const [submitMode, setSubmitMode] = useState('submit')


  const [notifyService, setNotifyService] = useState('')


  const [notifyUrl, setNotifyUrl] = useState('')





  const [taskId, setTaskId] = useState('')


  const [taskStatus, setTaskStatus] = useState(null)


  const [logs, setLogs] = useState([])


  const [logCursor, setLogCursor] = useState(0)


  const [taskHistory, setTaskHistory] = useState([])





  const [loading, setLoading] = useState(false)


  const [loginLoading, setLoginLoading] = useState(false)


  const [error, setError] = useState('')


  const [notice, setNotice] = useState('')





  useEffect(() => {


    if (!isAuthenticated()) {


      navigate('/login', { replace: true })


    }


  }, [navigate])





  useEffect(() => {


    logCursorRef.current = logCursor


  }, [logCursor])





  const stopPolling = useCallback(() => {


    if (pollRef.current) {


      clearInterval(pollRef.current)


      pollRef.current = null


    }


  }, [])





  const onAuthError = useCallback(


    (message) => {


      if (TOKEN_ERROR.test(String(message || ''))) {


        stopPolling()


        removeToken()


        navigate('/login', { replace: true })


        return true


      }


      return false


    },


    [navigate, stopPolling]


  )





  const callApi = useCallback(


    async (endpoint, options = {}) => {


      try {


        return await api(endpoint, options)


      } catch (err) {


        const message = err?.message || '请求失败'


        if (onAuthError(message)) return null


        throw err


      }


    },


    [onAuthError]


  )





  const appendLogs = useCallback((incoming) => {


    if (!Array.isArray(incoming) || incoming.length === 0) return


    setLogs((prev) => {


      const merged = [...prev, ...incoming]


      const seen = new Set()


      const deduped = []


      for (const item of merged) {


        const key = `${item.timestamp || ''}|${item.level || ''}|${item.message || ''}`


        if (seen.has(key)) continue


        seen.add(key)


        deduped.push(item)


      }


      return deduped.slice(-1000)


    })


  }, [])





  const loadCourses = useCallback(async () => {


    const resp = await callApi('/chaoxing/courses')


    if (!resp) return


    const list = Array.isArray(resp?.courses) ? resp.courses : Array.isArray(resp?.data) ? resp.data : []


    setCourses(list)


    setNotice(list.length > 0 ? `已获取 ${list.length} 门课程。` : '未查询到课程。')


  }, [callApi])





  const handleLogin = useCallback(


    async (event) => {


      event.preventDefault()


      setError('')


      setNotice('')


      if (!username.trim() || !password.trim()) {


        setError('请输入超星账号和密码。')


        return


      }





      setLoginLoading(true)


      try {


        const loginResp = await callApi('/chaoxing/login', {


          method: 'POST',


          body: JSON.stringify({ username: username.trim(), password })


        })


        if (!loginResp) return


        await loadCourses()


      } catch (err) {


        setError(err?.message || '登录失败。')


      } finally {


        setLoginLoading(false)


      }


    },


    [callApi, loadCourses, password, username]


  )





  const loadTaskSnapshot = useCallback(


    async (id, options = {}) => {


      const targetId = String(id || '').trim()


      if (!targetId) return





      const shouldResetLogs = Boolean(options.resetLogs)


      const cursor = shouldResetLogs ? 0 : logCursorRef.current





      if (shouldResetLogs) {


        setLogs([])


        setLogCursor(0)


        logCursorRef.current = 0


      }





      const statusResp = await callApi(`/course/status/${targetId}`)


      if (!statusResp) return





      setTaskStatus(statusResp)


      setTaskHistory((prev) =>


        mergeTaskHistory(


          prev,


          {


            ...statusResp,


            task_id: targetId,


            updated_at: statusResp.updated_at || statusResp.updatedAt || new Date().toISOString()


          },


          true


        )


      )





      const logsResp = await callApi(`/course/logs/${targetId}?cursor=${cursor}`)


      if (logsResp) {


        const items = (logsResp.data || []).map((item) => ({


          timestamp: item.timestamp || new Date().toISOString(),


          level: item.level || 'info',


          message: item.message || ''


        }))


        appendLogs(items)


        setLogCursor(toNum(logsResp.cursor, cursor + items.length))


      }





      const statusText = String(statusResp?.status || '').toLowerCase()


      if (DONE_STATUSES.has(statusText)) {


        setLoading(false)


        stopPolling()


      }


    },


    [appendLogs, callApi, stopPolling]


  )





  useEffect(() => {


    let active = true





    const restoreTasks = async () => {


      try {


        const resp = await callApi('/course/tasks')


        if (!resp || !active) return





        const rawTasks = Array.isArray(resp) ? resp : resp?.tasks || resp?.data || []


        const normalizedTasks = rawTasks


          .map(normalizeTaskItem)


          .filter(Boolean)


          .sort((a, b) => toTimestamp(b.updated_at) - toTimestamp(a.updated_at))





        if (!active) return


        setTaskHistory(normalizedTasks)


        if (normalizedTasks.length === 0) return





        const restoringTask = normalizedTasks.find((item) => RESTORE_STATUSES.has(item.status)) || normalizedTasks[0]


        if (!restoringTask?.task_id) return





        setTaskId(restoringTask.task_id)


        await loadTaskSnapshot(restoringTask.task_id, { resetLogs: true })


      } catch (err) {


        if (!active) return


        setError((prev) => prev || err?.message || '恢复任务状态失败。')


      }


    }





    void restoreTasks()


    return () => {


      active = false


    }


  }, [callApi, loadTaskSnapshot])





  const selectTaskFromHistory = useCallback(


    async (id) => {


      const targetId = String(id || '').trim()


      if (!targetId) return





      setError('')


      setNotice('')


      setTaskId(targetId)


      stopPolling()





      try {


        await loadTaskSnapshot(targetId, { resetLogs: true })


      } catch (err) {


        setError(err?.message || '读取任务详情失败。')


      }


    },


    [loadTaskSnapshot, stopPolling]


  )





  useEffect(() => {


    if (!taskId) return undefined





    const run = async () => {


      try {


        await loadTaskSnapshot(taskId)


      } catch (err) {


        setError(err?.message || '获取任务状态失败。')


      }


    }





    void run()


    stopPolling()


    pollRef.current = setInterval(() => {


      void run()


    }, POLL_MS)





    return () => stopPolling()


  }, [loadTaskSnapshot, stopPolling, taskId])





  const startTask = useCallback(async () => {


    setError('')


    setNotice('')





    if (!username.trim() || !password.trim()) {


      setError('请先填写账号和密码。')


      return


    }


    if (selectedCourses.length === 0) {


      setError('请至少选择一门课程。')


      return


    }





    setLoading(true)


    setLogs([])


    setLogCursor(0)


    logCursorRef.current = 0





    try {


      const resp = await callApi('/course/start', {


        method: 'POST',


        body: JSON.stringify({


          platform: 'chaoxing',


          username: username.trim(),


          password,


          course_ids: selectedCourses,


          speed,


          concurrency,


          unopened_strategy: unopenedStrategy,


          tiku_config: {


            provider: tikuProvider,


            token: tikuToken.trim(),


            coverage_threshold: coverageThreshold,


            judge_mapping: {


              correct: correctOptions


                .split(',')


                .map((item) => item.trim())


                .filter(Boolean),


              wrong: wrongOptions


                .split(',')


                .map((item) => item.trim())


                .filter(Boolean)


            },


            submit_mode: submitMode


          },


          notify_config:


            notifyService.trim() && notifyUrl.trim()


              ? {


                  service: notifyService.trim(),


                  url: notifyUrl.trim()


                }


              : {}


        })


      })





      if (!resp) return


      if (!resp.task_id) throw new Error('后端未返回任务 ID。')





      setTaskId(resp.task_id)


      setTaskStatus(resp)


      setTaskHistory((prev) =>


        mergeTaskHistory(


          prev,


          {


            ...resp,


            task_id: resp.task_id,


            status: String(resp.status || 'pending').toLowerCase(),


            updated_at: resp.updated_at || resp.updatedAt || new Date().toISOString()


          },


          true


        )


      )


      appendLogs([{ timestamp: new Date().toISOString(), level: 'success', message: `任务已创建：${resp.task_id}` }])


    } catch (err) {


      setLoading(false)


      setError(err?.message || '启动任务失败。')


    }


  }, [


    appendLogs,


    callApi,


    concurrency,


    correctOptions,


    coverageThreshold,


    notifyService,


    notifyUrl,


    password,


    selectedCourses,


    speed,


    submitMode,


    tikuProvider,


    tikuToken,


    unopenedStrategy,


    username,


    wrongOptions


  ])





  const controlTask = useCallback(


    async (action) => {


      if (!taskId) return


      try {


        const resp = await callApi(`/course/task/${taskId}/${action}`, { method: 'POST' })


        if (!resp) return


        setNotice(resp.message || '操作成功。')


        await loadTaskSnapshot(taskId)


      } catch (err) {


        setError(err?.message || '任务控制失败。')


      }


    },


    [callApi, loadTaskSnapshot, taskId]


  )





  const toggleExpand = useCallback(


    async (course) => {


      const courseId = getCourseId(course)


      if (!courseId) return





      setExpanded((prev) => {


        const next = new Set(prev)


        if (next.has(courseId)) next.delete(courseId)


        else next.add(courseId)


        return next


      })





      if (chapters[courseId]) return





      try {


        const resp = await callApi(`/course/chapters/${courseId}`)


        if (!resp) return


        setChapters((prev) => ({ ...prev, [courseId]: resp.chapters || [] }))


      } catch (err) {


        setError(err?.message || '获取章节失败。')


      }


    },


    [callApi, chapters]


  )





  const courseIds = useMemo(() => courses.map(getCourseId).filter(Boolean), [courses])


  const allSelected = useMemo(


    () => courseIds.length > 0 && courseIds.length === selectedCourses.length,


    [courseIds.length, selectedCourses.length]


  )


  const statusText = String(taskStatus?.status || '').toLowerCase()


  const isRunning = ['started', 'running', 'pending', 'paused', 'cancelling'].includes(statusText)


  const progress = taskStatus?.progress || {}
  const currentCourseName = normalizeCourseText(progress.current_course)
  const videoProgress = progress.video_progress && typeof progress.video_progress === 'object' ? progress.video_progress : null
  const videoCurrent = Math.max(0, toNum(videoProgress?.current))
  const videoDuration = Math.max(0, toNum(videoProgress?.duration))
  const videoPercent = videoDuration > 0 ? Math.min(100, Math.max(0, (videoCurrent / videoDuration) * 100)) : 0
  const coursePercent = toNum(progress.total) > 0 ? Math.min(100, Math.max(0, (toNum(progress.completed) / Math.max(toNum(progress.total), 1)) * 100)) : 0
  const chapterPercent = toNum(progress.total_chapters) > 0 ? Math.min(100, Math.max(0, (toNum(progress.completed_chapters) / Math.max(toNum(progress.total_chapters), 1)) * 100)) : 0





  return (


    <div className="min-h-screen bg-[#F8FAFC] p-6">


      <div className="mx-auto max-w-6xl space-y-6">


        <section className={CARD}>


          <h1 className="text-3xl font-bold text-slate-900">超星学习通自动刷课</h1>


          <p className="mt-2 text-sm text-slate-600">支持离开页面后恢复任务状态、日志与历史任务查看。</p>


        </section>





        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}


        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}





        {courses.length === 0 ? (


          <section className={CARD}>


            <h2 className="mb-4 text-xl font-semibold text-slate-900">登录账号</h2>


            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleLogin}>


              <input


                className="rounded-xl border border-slate-200 bg-white px-4 py-3"


                placeholder="请输入超星账号"


                value={username}


                onChange={(event) => setUsername(event.target.value)}


                required


              />


              <input


                className="rounded-xl border border-slate-200 bg-white px-4 py-3"


                type="password"


                placeholder="请输入密码"


                value={password}


                onChange={(event) => setPassword(event.target.value)}


                required


              />


              <button


                type="submit"


                disabled={loginLoading}


                className="min-h-[44px] cursor-pointer rounded-xl bg-sky-600 px-6 py-3 font-medium text-white transition duration-200 hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-400"


              >


                {loginLoading ? '登录中...' : '登录并获取课程'}


              </button>


            </form>


          </section>


        ) : (


          <>


            <section className={CARD}>


              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">


                <h2 className="text-xl font-semibold text-slate-900">课程列表</h2>


                <div className="flex gap-2">


                  <button


                    type="button"


                    className="min-h-[44px] cursor-pointer rounded-lg border border-slate-200 px-3 text-sm"


                    onClick={() => setSelectedCourses(allSelected ? [] : courseIds)}


                  >


                    {allSelected ? '取消全选' : '全选课程'}


                  </button>


                  <button


                    type="button"


                    className="min-h-[44px] cursor-pointer rounded-lg border border-slate-200 px-3 text-sm"


                    onClick={() => {


                      void loadCourses()


                    }}


                  >


                    刷新课程


                  </button>


                </div>


              </div>





              <div className="max-h-80 space-y-2 overflow-y-auto">


                {courses.map((course) => {


                  const courseId = getCourseId(course)


                  const isExpanded = expanded.has(courseId)


                  return (


                    <div key={courseId || Math.random()} className="rounded-xl border border-white/30 bg-white/60 p-3">


                      <div className="flex items-center gap-3">


                        <input


                          type="checkbox"


                          className="h-5 w-5"


                          checked={selectedCourses.includes(courseId)}


                          onChange={() => {


                            setSelectedCourses((prev) =>


                              prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]


                            )


                          }}


                        />


                        <div className="flex-1">


                          <p className="font-semibold text-slate-900">{getCourseName(course)}</p>


                          <p className="text-xs text-slate-500">{courseId || '--'}</p>


                        </div>


                        <button


                          type="button"


                          className="min-h-[44px] min-w-[44px] cursor-pointer rounded-lg border border-slate-200 px-2 text-sm"


                          onClick={() => {


                            void toggleExpand(course)


                          }}


                        >


                          {isExpanded ? '收起' : '章节'}


                        </button>


                      </div>





                      {isExpanded && (


                        <div className="mt-2 space-y-1 text-sm text-slate-600">


                          {(chapters[courseId] || []).map((chapter) => (


                            <div key={`${courseId}-${chapter.id || chapter.name}`} className="rounded-lg bg-white px-3 py-2">


                              {chapter.title || chapter.name}


                            </div>


                          ))}


                          {(chapters[courseId] || []).length === 0 && (


                            <div className="text-xs text-slate-500">暂无章节数据</div>


                          )}


                        </div>


                      )}


                    </div>


                  )


                })}


              </div>


            </section>





            <section className={`${CARD} grid gap-4 md:grid-cols-2`}>


              <div className="space-y-3">


                <label className="text-sm text-slate-700">播放速度：{speed.toFixed(1)}x</label>


                <input


                  type="range"


                  min="1"


                  max="2"


                  step="0.1"


                  value={speed}


                  onChange={(event) => setSpeed(toNum(event.target.value, 1.5))}


                  className="w-full"


                />


                <label className="text-sm text-slate-700">并发章节：{concurrency}</label>


                <input


                  type="range"


                  min="1"


                  max="16"


                  step="1"


                  value={concurrency}


                  onChange={(event) => setConcurrency(toNum(event.target.value, 4))}


                  className="w-full"


                />


                <select


                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2"


                  value={unopenedStrategy}


                  onChange={(event) => setUnopenedStrategy(event.target.value)}


                >


                  <option value="retry">未开放章节重试</option>


                  <option value="continue">未开放章节跳过</option>


                  <option value="ask">未开放章节手动处理</option>


                </select>


              </div>





              <div className="space-y-3">


                <select


                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2"


                  value={tikuProvider}


                  onChange={(event) => setTikuProvider(event.target.value)}


                >


                  <option value="TikuYanxi">TikuYanxi</option>


                  <option value="TikuLike">TikuLike</option>


                  <option value="TikuAdapter">TikuAdapter</option>


                  <option value="AI">AI</option>


                  <option value="SiliconFlow">SiliconFlow</option>


                  <option value="LocalCache">LocalCache</option>


                </select>


                <input


                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"


                  placeholder="题库 Token（可选）"


                  value={tikuToken}


                  onChange={(event) => setTikuToken(event.target.value)}


                />


                <label className="text-sm text-slate-700">题库覆盖阈值：{coverageThreshold.toFixed(2)}</label>


                <input


                  type="range"


                  min="0.5"


                  max="1"


                  step="0.05"


                  value={coverageThreshold}


                  onChange={(event) => setCoverageThreshold(toNum(event.target.value, 0.9))}


                  className="w-full"


                />


                <input


                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"


                  placeholder="正确映射，例如：对,正确,是"


                  value={correctOptions}


                  onChange={(event) => setCorrectOptions(event.target.value)}


                />


                <input


                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"


                  placeholder="错误映射，例如：错,错误,否"


                  value={wrongOptions}


                  onChange={(event) => setWrongOptions(event.target.value)}


                />


                <select


                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2"


                  value={submitMode}


                  onChange={(event) => setSubmitMode(event.target.value)}


                >


                  <option value="submit">自动提交</option>


                  <option value="save">仅保存</option>


                </select>


                <input


                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"


                  placeholder="通知服务（可选）"


                  value={notifyService}


                  onChange={(event) => setNotifyService(event.target.value)}


                />


                <input


                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"


                  placeholder="通知地址（可选）"


                  value={notifyUrl}


                  onChange={(event) => setNotifyUrl(event.target.value)}


                />


              </div>


            </section>





            <section className={CARD}>


              <div className="mb-4 flex flex-wrap gap-2">


                <button


                  type="button"


                  onClick={() => {


                    void startTask()


                  }}


                  disabled={loading || isRunning}


                  className="min-h-[44px] cursor-pointer rounded-xl bg-sky-600 px-6 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400"


                >


                  {loading ? '启动中...' : '开始刷课'}


                </button>


                <button


                  type="button"


                  onClick={() => {


                    void controlTask('pause')


                  }}


                  disabled={statusText !== 'running'}


                  className="min-h-[44px] cursor-pointer rounded-xl border border-amber-300 px-4 py-2 disabled:cursor-not-allowed disabled:border-slate-200"


                >


                  暂停


                </button>


                <button


                  type="button"


                  onClick={() => {


                    void controlTask('resume')


                  }}


                  disabled={statusText !== 'paused'}


                  className="min-h-[44px] cursor-pointer rounded-xl border border-emerald-300 px-4 py-2 disabled:cursor-not-allowed disabled:border-slate-200"


                >


                  继续


                </button>


                <button


                  type="button"


                  onClick={() => {


                    void controlTask('stop')


                  }}


                  disabled={!taskId || statusText === 'cancelling' || DONE_STATUSES.has(statusText)}


                  className="min-h-[44px] cursor-pointer rounded-xl border border-red-300 px-4 py-2 disabled:cursor-not-allowed disabled:border-slate-200"


                >


                  停止


                </button>


              </div>





              <div className="grid gap-3 text-sm md:grid-cols-4">


                <div className="rounded-xl border border-slate-200 bg-white p-3">


                  <p className="text-slate-500">任务状态</p>


                  <p className="font-semibold">{taskStatus?.status || 'idle'}</p>


                </div>


                <div className="rounded-xl border border-slate-200 bg-white p-3">


                  <p className="text-slate-500">当前任务</p>


                  <p className="font-semibold">{taskStatus?.current_task || '--'}</p>


                </div>


                <div className="rounded-xl border border-slate-200 bg-white p-3">


                  <p className="text-slate-500">课程进度</p>


                  <p className="font-semibold">


                    {toNum(progress.completed)}/{toNum(progress.total)}（失败 {toNum(progress.failed)}）


                  </p>


                </div>


                <div className="rounded-xl border border-slate-200 bg-white p-3">


                  <p className="text-slate-500">章节进度</p>


                  <p className="font-semibold">


                    {toNum(progress.completed_chapters)}/{toNum(progress.total_chapters)}


                  </p>


                </div>


              </div>



              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">当前课程</p>
                  <p className="mt-1 font-semibold text-slate-900">{currentCourseName || '--'}</p>
                  <p className="mt-3 text-sm text-slate-500">当前视频</p>
                  <p className="mt-1 font-semibold text-slate-900">{videoProgress?.name || '--'}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-500 transition-all duration-200" style={{ width: `${videoPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">播放进度：{videoCurrent.toFixed(1)} / {videoDuration.toFixed(1)} 秒（{Math.round(videoPercent)}%）</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">任务推进</p>
                  <p className="mt-1 text-sm text-slate-700">课程：{toNum(progress.completed)}/{toNum(progress.total)}（{Math.round(coursePercent)}%）</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${coursePercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-700">章节：{toNum(progress.completed_chapters)}/{toNum(progress.total_chapters)}（{Math.round(chapterPercent)}%）</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500 transition-all duration-200" style={{ width: `${chapterPercent}%` }} />
                  </div>
                </div>
              </div>
            </section>





            <section className={CARD}>


              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">


                <h2 className="text-xl font-semibold text-slate-900">最近任务 / 历史任务</h2>


                <p className="text-xs text-slate-500">点击任意任务可恢复详情和日志</p>


              </div>


              {taskHistory.length === 0 ? (


                <p className="text-sm text-slate-400">暂无历史任务</p>


              ) : (


                <div className="space-y-2">


                  {taskHistory.map((task) => {


                    const selected = task.task_id === taskId


                    return (


                      <button


                        key={task.task_id}


                        type="button"


                        onClick={() => {


                          void selectTaskFromHistory(task.task_id)


                        }}


                        className={`min-h-[44px] w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${


                          selected


                            ? 'border-sky-400 bg-sky-50'


                            : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'


                        }`}


                      >


                        <p className="font-mono text-sm text-slate-900">{task.task_id}</p>


                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-600">


                          <span>状态：{task.status || 'unknown'}</span>


                          <span>更新时间：{formatTaskTime(task.updated_at)}</span>


                        </div>


                      </button>


                    )


                  })}


                </div>


              )}


            </section>


          </>


        )}





        <section className={CARD}>


          <h2 className="mb-3 text-xl font-semibold text-slate-900">任务日志</h2>


          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-slate-950 p-4 text-sm">


            {logs.length === 0 ? (


              <p className="text-slate-400">暂无日志</p>


            ) : (


              logs.map((item, index) => (


                <div key={`${item.timestamp}-${index}`} className="text-slate-200">


                  [{new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}] {item.message}


                </div>


              ))


            )}


          </div>


        </section>


      </div>


    </div>


  )


}


