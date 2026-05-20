"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Video = {
  id: number
  url: string
  user_id: string
}

type Comment = {
  id: number
  text: string
  time: number
  video_id: number
}

export default function Home() {
  const router = useRouter()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState<any>(null)

  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] =
    useState<Video | null>(null)

  const [comments, setComments] = useState<Comment[]>([])

  const [commentText, setCommentText] = useState("")

  const [uploading, setUploading] = useState(false)

  const [currentTime, setCurrentTime] = useState(0)

  const [drawing, setDrawing] = useState(false)

  const [drawMode, setDrawMode] =
    useState(false)

  // AUTH
  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push("/login")
      return
    }

    setUser(session.user)

    await fetchVideos(session.user.id)

    setLoading(false)
  }

  // FETCH VIDEOS
  async function fetchVideos(userId: string) {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setVideos(data || [])

    if (data && data.length > 0) {
      setSelectedVideo(data[0])

      fetchComments(data[0].id)
    }
  }

  // FETCH COMMENTS
  async function fetchComments(videoId: number) {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setComments(data || [])
  }

  // UPLOAD VIDEO
  async function uploadVideo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file || !user) return

    setUploading(true)

    const cleanFileName = `${Date.now()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`

    const { error: uploadError } =
      await supabase.storage
        .from("videos")
        .upload(cleanFileName, file)

    if (uploadError) {
      console.error(uploadError)
      alert(uploadError.message)

      setUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("videos")
      .getPublicUrl(cleanFileName)

    const { error: dbError } = await supabase
      .from("videos")
      .insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ])

    if (dbError) {
      console.error(dbError)
      alert(dbError.message)

      setUploading(false)
      return
    }

    await fetchVideos(user.id)

    setUploading(false)
  }

  // ADD COMMENT
  async function addComment() {
    if (
      !commentText.trim() ||
      !selectedVideo ||
      !videoRef.current
    )
      return

    const currentVideoTime =
      videoRef.current.currentTime

    const { error } = await supabase
      .from("comments")
      .insert([
        {
          text: commentText,
          time: currentVideoTime,
          video_id: selectedVideo.id,
        },
      ])

    if (error) {
      console.error(error)
      return
    }

    setCommentText("")

    fetchComments(selectedVideo.id)
  }

  // DELETE COMMENT
  async function deleteComment(id: number) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      return
    }

    if (selectedVideo) {
      fetchComments(selectedVideo.id)
    }
  }

  // GO TO TIMESTAMP
  function goToTime(time: number) {
    if (!videoRef.current) return

    videoRef.current.currentTime = time

    videoRef.current.play()
  }

  // GET REAL MOUSE POSITION
  function getMousePos(
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement>
  ) {
    const rect = canvas.getBoundingClientRect()

    return {
      x:
        ((e.clientX - rect.left) /
          rect.width) *
        canvas.width,

      y:
        ((e.clientY - rect.top) /
          rect.height) *
        canvas.height,
    }
  }

  // START DRAWING
  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement>
  ) {
    if (!drawMode) return

    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext("2d")

    if (!ctx) return

    const pos = getMousePos(canvas, e)

    setDrawing(true)

    ctx.beginPath()

    ctx.moveTo(pos.x, pos.y)
  }

  // DRAW
  function draw(
    e: React.MouseEvent<HTMLCanvasElement>
  ) {
    if (!drawing || !drawMode) return

    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext("2d")

    if (!ctx) return

    const pos = getMousePos(canvas, e)

    ctx.lineWidth = 5
    ctx.lineCap = "round"
    ctx.strokeStyle = "#ff3b3b"

    ctx.lineTo(pos.x, pos.y)

    ctx.stroke()
  }

  // STOP DRAWING
  function stopDrawing() {
    setDrawing(false)
  }

  // CLEAR CANVAS
  function clearCanvas() {
    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext("2d")

    if (!ctx) return

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    )
  }

  // LOGOUT
  async function logout() {
    await supabase.auth.signOut()

    window.location.href = "/login"
  }

  // LOADING
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white text-2xl">
        Loading...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">

      {/* BACKGROUND */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)] pointer-events-none" />

      {/* TOPBAR */}
      <div className="h-20 border-b border-white/10 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">

        <div>
          <h1 className="text-3xl font-black tracking-tight">
            FrameFlow
          </h1>

          <p className="text-zinc-500 text-sm">
            Video Review Platform
          </p>
        </div>

        <div className="flex items-center gap-4">

          <label className="bg-white text-black px-6 py-3 rounded-2xl font-bold cursor-pointer hover:scale-105 transition">

            {uploading
              ? "Uploading..."
              : "Upload"}

            <input
              type="file"
              accept="video/*"
              onChange={uploadVideo}
              className="hidden"
            />
          </label>

          <button
            onClick={logout}
            className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-3 rounded-2xl hover:bg-red-500/20 transition"
          >
            Logout
          </button>

        </div>

      </div>

      <div className="flex h-[calc(100vh-80px)]">

        {/* SIDEBAR */}
        <div className="w-[360px] border-r border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-y-auto p-5">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-xl font-bold">
              Projects
            </h2>

            <div className="bg-white/10 text-sm px-3 py-1 rounded-full">
              {videos.length}
            </div>

          </div>

          <div className="space-y-4">

            {videos.length === 0 && (
              <div className="border border-dashed border-white/10 rounded-3xl p-10 text-center text-zinc-500">
                No videos uploaded
              </div>
            )}

            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setSelectedVideo(video)

                  fetchComments(video.id)

                  clearCanvas()
                }}
                className={`group w-full rounded-3xl overflow-hidden border transition-all duration-300 ${
                  selectedVideo?.id === video.id
                    ? "border-white shadow-2xl shadow-white/10 scale-[1.02]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >

                <video
                  src={video.url}
                  className="w-full aspect-video object-cover"
                />

              </button>
            ))}

          </div>

        </div>

        {/* MAIN */}
        <div className="flex-1 flex overflow-hidden">

          {selectedVideo ? (
            <>
              {/* VIDEO SECTION */}
              <div className="flex-1 p-8 overflow-y-auto">

                <div className="max-w-6xl mx-auto">

                  <div className="mb-6 flex items-center justify-between">

                    <div>
                      <h2 className="text-4xl font-black mb-2">
                        Video Review
                      </h2>

                      <p className="text-zinc-500">
                        Collaborative feedback &
                        annotations
                      </p>
                    </div>

                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          setDrawMode(!drawMode)
                        }
                        className={`px-5 py-3 rounded-2xl transition border ${
                          drawMode
                            ? "bg-blue-500 text-white border-blue-400"
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        }`}
                      >
                        {drawMode
                          ? "Drawing ON"
                          : "Drawing OFF"}
                      </button>

                      <button
                        onClick={clearCanvas}
                        className="bg-white/10 border border-white/10 px-5 py-3 rounded-2xl hover:bg-white/20 transition"
                      >
                        Clear
                      </button>

                    </div>

                  </div>

                  {/* VIDEO PLAYER */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5 backdrop-blur-xl shadow-2xl">

                    <div className="relative">

                      <video
                        ref={videoRef}
                        src={selectedVideo.url}
                        controls
                        onTimeUpdate={() => {
                          if (videoRef.current) {
                            setCurrentTime(
                              videoRef.current.currentTime
                            )
                          }
                        }}
                        className="w-full rounded-3xl"
                      />

                      {/* DRAW CANVAS */}
                      <canvas
                        ref={canvasRef}
                        width={1920}
                        height={1080}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className={`absolute inset-0 w-full h-full rounded-3xl ${
                          drawMode
                            ? "pointer-events-auto cursor-crosshair"
                            : "pointer-events-none"
                        }`}
                      />

                    </div>

                    {/* TIMELINE */}
                    <div className="relative mt-6 h-4 bg-white/10 rounded-full overflow-hidden">

                      {comments.map((comment) => {
                        const duration =
                          videoRef.current?.duration || 1

                        const left =
                          (comment.time / duration) * 100

                        return (
                          <button
                            key={comment.id}
                            onClick={() =>
                              goToTime(comment.time)
                            }
                            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-black hover:scale-125 transition-all duration-200 shadow-lg shadow-blue-500/50"
                            style={{
                              left: `${left}%`,
                            }}
                          />
                        )
                      })}

                    </div>

                  </div>

                  {/* COMMENT INPUT */}
                  <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-[32px] p-5 backdrop-blur-xl">

                    <div className="flex gap-4">

                      <input
                        type="text"
                        placeholder="Leave feedback..."
                        value={commentText}
                        onChange={(e) =>
                          setCommentText(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addComment()
                          }
                        }}
                        className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-white/30 transition"
                      />

                      <button
                        onClick={addComment}
                        className="bg-white text-black px-8 rounded-2xl font-bold hover:scale-105 transition"
                      >
                        Add
                      </button>

                    </div>

                  </div>

                </div>

              </div>

              {/* COMMENTS */}
              <div className="w-[420px] border-l border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-y-auto p-6">

                <div className="flex items-center justify-between mb-8">

                  <div>
                    <h2 className="text-2xl font-black">
                      Feedback
                    </h2>

                    <p className="text-zinc-500 text-sm">
                      Timestamped comments
                    </p>
                  </div>

                  <div className="bg-white/10 px-4 py-2 rounded-full text-sm">
                    {comments.length}
                  </div>

                </div>

                <div className="space-y-4">

                  {comments.length === 0 && (
                    <div className="border border-dashed border-white/10 rounded-3xl p-10 text-center text-zinc-500">
                      No comments yet
                    </div>
                  )}

                  {comments.map((comment) => {
                    const isActive =
                      Math.abs(
                        currentTime - comment.time
                      ) < 2

                    return (
                      <div
                        key={comment.id}
                        className={`rounded-3xl p-5 transition-all duration-300 border ${
                          isActive
                            ? "bg-blue-500/20 border-blue-400 shadow-2xl shadow-blue-500/20 scale-[1.02]"
                            : "bg-black/40 border-white/10 hover:border-white/20"
                        }`}
                      >

                        <div className="flex items-center justify-between mb-4">

                          <button
                            onClick={() =>
                              goToTime(comment.time)
                            }
                            className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm hover:bg-blue-500/20 transition"
                          >
                            {Math.floor(comment.time)}s
                          </button>

                          <button
                            onClick={() =>
                              deleteComment(comment.id)
                            }
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>

                        </div>

                        <p className="text-zinc-200 leading-relaxed">
                          {comment.text}
                        </p>

                      </div>
                    )
                  })}

                </div>

              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-3xl">
              Upload your first video
            </div>
          )}

        </div>

      </div>

    </main>
  )
}