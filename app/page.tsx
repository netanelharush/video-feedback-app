"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Video = {
  id: number;
  url: string;
  user_id: string;
};

type Comment = {
  id: number;
  text: string;
  time: number;
  video_id: number;
};

type Annotation = {
  id: string;
  time: number;
  duration: number;
  paths: {
    x: number;
    y: number;
  }[];
  video_id: number;
};

export default function Home() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [commentText, setCommentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [switchingVideoId, setSwitchingVideoId] = useState<number | null>(null);
  const [savingComment, setSavingComment] = useState(false);

  const totalFeedback = comments.length + annotations.length;

  function openVideo(video: Video) {
    setSwitchingVideoId(video.id);
    setSelectedVideo(video);
    setComments([]);
    setAnnotations([]);
    setCurrentTime(0);
    setShowProjects(false);

    Promise.all([fetchComments(video.id), fetchAnnotations(video.id)]).finally(
      () => {
        window.setTimeout(() => setSwitchingVideoId(null), 180);
      },
    );
  }

  function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  // AUTH
  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    await fetchVideos(session.user.id);
    setLoading(false);
  }

  // FETCH VIDEOS
  async function fetchVideos(userId: string) {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setVideos(data || []);

    if (data && data.length > 0) {
      setSelectedVideo(data[0]);
      fetchComments(data[0].id);
      fetchAnnotations(data[0].id);
    } else {
      setSelectedVideo(null);
      setComments([]);
      setAnnotations([]);
    }
  }

  // FETCH COMMENTS
  async function fetchComments(videoId: number) {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setComments(data || []);
  }

  // FETCH ANNOTATIONS
  async function fetchAnnotations(videoId: number) {
    const { data, error } = await supabase
      .from("annotations")
      .select("*")
      .eq("video_id", videoId);

    if (error) {
      console.error(error);
      return;
    }

    setAnnotations(data || []);
  }

  // UPLOAD VIDEO
  async function uploadVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    await handleFileUpload(file);
    event.target.value = "";
  }

  async function handleFileUpload(file?: File) {
    if (!file || !user || uploading) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("מכין העלאה...");

    let fakeProgress = 0;

    const progressTimer = window.setInterval(() => {
      fakeProgress += Math.random() * 12;

      if (fakeProgress < 35) {
        setUploadStatus("מעלה וידאו...");
      } else if (fakeProgress < 75) {
        setUploadStatus("כמעט סיימנו...");
      } else {
        setUploadStatus("שומר וידאו...");
      }

      setUploadProgress(Math.min(Math.round(fakeProgress), 95));
    }, 350);

    try {
      const cleanFileName = `${Date.now()}-${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_",
      )}`;

      const uploadPath = `${user.id}/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(uploadPath, file);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(97);
      setUploadStatus("יוצר פרויקט...");

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(uploadPath);

      const { error: dbError } = await supabase.from("videos").insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ]);

      if (dbError) {
        throw dbError;
      }

      setUploadProgress(100);
      setUploadStatus("ההעלאה הושלמה");

      await fetchVideos(user.id);

      window.setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus("");
      }, 700);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "ההעלאה נכשלה");
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    } finally {
      window.clearInterval(progressTimer);
    }
  }

  // DELETE VIDEO
  async function deleteVideo(video: Video) {
    if (!user) return;

    const ok = confirm("למחוק את הווידאו הזה?");
    if (!ok) return;

    setDeletingVideoId(video.id);

    const marker = "/storage/v1/object/public/videos/";
    const storagePath = decodeURIComponent(
      video.url.split(marker)[1]?.split("?")[0] || "",
    );

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from("videos")
        .remove([storagePath]);

      if (storageError) {
        console.error(storageError);
        alert(storageError.message);
        setDeletingVideoId(null);
        return;
      }
    }

    const { error: commentsError } = await supabase
      .from("comments")
      .delete()
      .eq("video_id", video.id);

    if (commentsError) {
      console.error(commentsError);
      alert(commentsError.message);
      setDeletingVideoId(null);
      return;
    }

    const { error: annotationsError } = await supabase
      .from("annotations")
      .delete()
      .eq("video_id", video.id);

    if (annotationsError) {
      console.error(annotationsError);
      alert(annotationsError.message);
      setDeletingVideoId(null);
      return;
    }

    const { error: videoError } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id)
      .eq("user_id", user.id);

    if (videoError) {
      console.error(videoError);
      alert(videoError.message);
      setDeletingVideoId(null);
      return;
    }

    await fetchVideos(user.id);
    setDeletingVideoId(null);
  }

  // ADD COMMENT
  async function addComment() {
    const cleanText = commentText.trim();
    if (!cleanText || !selectedVideo || !videoRef.current || savingComment)
      return;

    const currentVideoTime = videoRef.current.currentTime;
    const tempComment: Comment = {
      id: -Date.now(),
      text: cleanText,
      time: currentVideoTime,
      video_id: selectedVideo.id,
    };

    setSavingComment(true);
    setCommentText("");
    setComments((prev) => [...prev, tempComment]);

    const { error } = await supabase.from("comments").insert([
      {
        text: cleanText,
        time: currentVideoTime,
        video_id: selectedVideo.id,
      },
    ]);

    if (error) {
      console.error(error);
      setComments((prev) =>
        prev.filter((comment) => comment.id !== tempComment.id),
      );
      setCommentText(cleanText);
      setSavingComment(false);
      return;
    }

    await fetchComments(selectedVideo.id);
    setSavingComment(false);
  }

  // DELETE COMMENT
  async function deleteComment(id: number) {
    const previousComments = comments;
    setComments((prev) => prev.filter((comment) => comment.id !== id));

    if (id < 0) return;

    const { error } = await supabase.from("comments").delete().eq("id", id);

    if (error) {
      console.error(error);
      setComments(previousComments);
    }
  }

  // GO TO TIME
  function goToTime(time: number) {
    if (!videoRef.current) return;

    videoRef.current.currentTime = time;
    videoRef.current.play();
  }

  // GET MOUSE POSITION
  function getMousePos(
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement>,
  ) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  // START DRAWING
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getMousePos(canvas, e);

    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setCurrentPath([{ x: pos.x, y: pos.y }]);
  }

  // DRAW
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || !drawMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getMousePos(canvas, e);

    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setCurrentPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }

  // STOP DRAWING
  async function stopDrawing() {
    if (
      !drawing ||
      !videoRef.current ||
      currentPath.length === 0 ||
      !selectedVideo
    ) {
      setDrawing(false);
      return;
    }

    const newAnnotation = {
      id: crypto.randomUUID(),
      time: videoRef.current.currentTime,
      duration: 2,
      paths: currentPath,
      video_id: selectedVideo.id,
    };

    const { error } = await supabase
      .from("annotations")
      .insert([newAnnotation]);

    if (error) {
      console.error(error);
      return;
    }

    setAnnotations((prev) => [...prev, newAnnotation]);
    setCurrentPath([]);
    setDrawing(false);
  }

  // CLEAR CANVAS ON SCREEN ONLY
  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // DRAW ACTIVE ANNOTATIONS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleAnnotations = annotations.filter(
      (annotation) =>
        currentTime >= annotation.time &&
        currentTime <= annotation.time + annotation.duration,
    );

    visibleAnnotations.forEach((annotation) => {
      if (annotation.paths.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = "#ff3b3b";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.moveTo(annotation.paths[0].x, annotation.paths[0].y);

      annotation.paths.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
    });
  }, [currentTime, annotations]);

  // LOGOUT
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // LOADING
  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#05050a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_34%)]" />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] px-10 py-8 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
            <h1 className="text-2xl font-black">טוען את flow.il</h1>
            <p className="mt-2 text-sm text-zinc-400">
              מכין את סביבת העבודה שלך...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050a] text-white">
      <style jsx global>{`
        @keyframes softEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floatGlow {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.72;
          }
          50% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        @keyframes shimmerMove {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .soft-enter {
          animation: softEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .float-glow {
          animation: floatGlow 7s ease-in-out infinite;
        }

        .button-pop {
          transform: translateZ(0);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            opacity 180ms ease;
          will-change: transform;
        }

        .button-pop:hover {
          transform: translateY(-2px) scale(1.035);
        }

        .button-pop:active {
          transform: translateY(0) scale(0.96);
        }

        .card-pop {
          transform: translateZ(0);
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease,
            background 220ms ease,
            opacity 220ms ease;
          will-change: transform;
        }

        .card-pop:hover {
          transform: translateY(-3px) scale(1.015);
        }

        .shimmer {
          position: relative;
          overflow: hidden;
        }

        .shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.16),
            transparent
          );
          animation: shimmerMove 1.5s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 float-glow bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.12),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />

      {/* TOPBAR */}
      <div className="soft-enter sticky top-0 z-30 border-b border-white/10 bg-black/35 px-4 py-4 backdrop-blur-2xl lg:px-8">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/logo.png"
              alt="flow.il"
              className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_0_28px_rgba(120,119,255,0.55)]"
            />

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight lg:text-3xl">
                flow.il
              </h1>
              <p className="truncate text-sm text-zinc-400">
                סקירת סרטונים, סימונים ואיסוף פידבק במקום אחד
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <button
              onClick={() => setShowProjects(true)}
              className="button-pop lg:hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold hover:border-white/25 hover:bg-white/20"
            >
              פרויקטים
            </button>

            <button
              onClick={logout}
              className="button-pop rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:border-red-400/50 hover:bg-red-500/20 lg:px-5"
            >
              התנתקות
            </button>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="soft-enter fixed left-1/2 top-24 z-[60] w-[92%] max-w-xl -translate-x-1/2 overflow-hidden rounded-[32px] border border-white/10 bg-zinc-950/90 p-5 shadow-2xl shadow-blue-950/40 backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400" />

          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-400">סטטוס העלאה</p>
              <h3 className="text-xl font-black">{uploadStatus}</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-2xl font-black">
              {uploadProgress}%
            </div>
          </div>

          <div className="h-4 w-full overflow-hidden rounded-full bg-white/10 p-1">
            <div
              className="shimmer h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 shadow-lg shadow-blue-500/30 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-zinc-500">
            השאר את הדף פתוח עד שההעלאה מסתיימת.
          </p>
        </div>
      )}

      <div className="relative mx-auto flex h-[calc(100vh-81px)] max-w-[1800px]">
        {showProjects && (
          <div
            onClick={() => setShowProjects(false)}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`soft-enter fixed left-0 top-0 z-50 h-screen w-[320px] transform overflow-y-auto border-r border-white/10 bg-[#07070d]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-2xl transition-transform duration-300 ${
            showProjects ? "translate-x-0" : "-translate-x-full"
          } lg:relative lg:top-auto lg:z-auto lg:h-auto lg:w-[380px] lg:translate-x-0 lg:bg-white/[0.035] lg:shadow-none`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">פרויקטים</h2>
              <p className="text-sm text-zinc-500">
                {videos.length} סרטונים שהועלו
              </p>
            </div>

            <button
              onClick={() => setShowProjects(false)}
              className="button-pop rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/20 lg:hidden"
            >
              סגור
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-2xl font-black">{videos.length}</p>
              <p className="text-xs text-zinc-500">סרטונים</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-2xl font-black">{totalFeedback}</p>
              <p className="text-xs text-zinc-500">הערות</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={uploadVideo}
            className="hidden"
          />

          <div
            onDoubleClick={() => fileInputRef.current?.click()}
            onClick={() => {
              if (videos.length === 0) fileInputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingUpload(true);
            }}
            onDragLeave={() => setIsDraggingUpload(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingUpload(false);
              handleFileUpload(event.dataTransfer.files?.[0]);
            }}
            className={`card-pop mb-5 rounded-[32px] border border-dashed p-6 text-center ${
              isDraggingUpload
                ? "scale-[1.02] border-blue-300 bg-blue-500/15 shadow-2xl shadow-blue-500/20"
                : "border-white/15 bg-white/[0.03] hover:scale-[1.01] hover:border-white/30 hover:bg-white/[0.06]"
            } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl font-black text-black shadow-2xl shadow-white/10">
              {uploading ? `${uploadProgress}%` : "+"}
            </div>
            <h3 className="font-black">
              {uploading ? uploadStatus : "גרור וידאו לכאן"}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              גרור קובץ וידאו לכאן, או לחץ פעמיים על האזור כדי לבחור אחד.
            </p>
            {uploading && (
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10 p-1">
                <div
                  className="shimmer h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className={`soft-enter card-pop group overflow-hidden rounded-[28px] border bg-black/30 ${
                  selectedVideo?.id === video.id
                    ? "border-white/70 shadow-2xl shadow-blue-500/10"
                    : "border-white/10 hover:border-white/25 hover:shadow-2xl hover:shadow-black/30"
                }`}
              >
                <button
                  onClick={() => {
                    openVideo(video);
                  }}
                  className="relative w-full cursor-pointer text-left active:scale-[0.99]"
                >
                  <video
                    src={video.url}
                    className="aspect-video w-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">
                        פרויקט #{videos.length - index}
                      </p>
                      <p className="text-xs text-zinc-300">לחץ לפתיחה</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur-xl">
                      {selectedVideo?.id === video.id ? "פעיל" : "פתח"}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => deleteVideo(video)}
                  disabled={deletingVideoId === video.id}
                  className="button-pop w-full border-t border-red-500/10 bg-red-500/[0.06] py-3 text-sm font-black text-red-300 hover:bg-red-500/15 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingVideoId === video.id
                    ? "מוחק..."
                    : "מחק וידאו"}
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {selectedVideo ? (
            <>
              <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="mx-auto max-w-6xl">
                  <div className="soft-enter mb-6 overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="mb-3 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                          סביבת סקירה חיה
                        </div>
                        <h2 className="text-3xl font-black tracking-tight lg:text-5xl">
                          סקירת וידאו
                        </h2>
                        <p className="mt-2 max-w-2xl text-zinc-400">
                          הוסף הערות לפי זמן, קפוץ בין תגובות וסמן ישירות על הפריים.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            const newMode = !drawMode;
                            setDrawMode(newMode);

                            if (newMode && videoRef.current) {
                              videoRef.current.pause();
                            }
                          }}
                          className={`button-pop rounded-2xl border px-5 py-3 font-black ${
                            drawMode
                              ? "border-blue-300/70 bg-blue-500 text-white shadow-2xl shadow-blue-500/25"
                              : "border-white/10 bg-white/10 text-white hover:border-white/25 hover:bg-white/20"
                          }`}
                        >
                          {drawMode ? "ציור פעיל" : "ציור כבוי"}
                        </button>

                        <button
                          onClick={clearCanvas}
                          className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black transition-all duration-200 hover:scale-105 hover:border-white/25 hover:bg-white/20 active:scale-95"
                        >
                          נקה מסך
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                        <p className="text-2xl font-black">{comments.length}</p>
                        <p className="text-xs text-zinc-500">תגובות</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                        <p className="text-2xl font-black">
                          {annotations.length}
                        </p>
                        <p className="text-xs text-zinc-500">סימונים</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                        <p className="text-2xl font-black">
                          {formatTime(currentTime)}
                        </p>
                        <p className="text-xs text-zinc-500">זמן נוכחי</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`soft-enter overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-300 lg:p-5 ${
                      switchingVideoId === selectedVideo.id
                        ? "scale-[0.99] opacity-70"
                        : "scale-100 opacity-100"
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-[28px] bg-black shadow-2xl shadow-black/60">
                      <video
                        ref={videoRef}
                        src={selectedVideo.url}
                        controls
                        onTimeUpdate={() => {
                          if (videoRef.current) {
                            setCurrentTime(videoRef.current.currentTime);
                          }
                        }}
                        className="w-full rounded-[28px]"
                      />

                      <canvas
                        ref={canvasRef}
                        width={1920}
                        height={1080}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className={`absolute inset-0 h-full w-full rounded-[28px] ${
                          drawMode
                            ? "pointer-events-auto cursor-crosshair ring-2 ring-blue-400/60"
                            : "pointer-events-none"
                        }`}
                      />

                      {drawMode && (
                        <div className="soft-enter pointer-events-none absolute left-4 top-4 rounded-2xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-black text-blue-100 backdrop-blur-xl">
                          מצב ציור פעיל
                        </div>
                      )}

                      {switchingVideoId === selectedVideo.id && (
                        <div className="soft-enter pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-sm">
                          <div className="rounded-3xl border border-white/10 bg-black/60 px-5 py-4 text-sm font-black text-white shadow-2xl">
                            פותח פרויקט...
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
                        <span>ציר זמן</span>
                        <span>{totalFeedback} סימונים</span>
                      </div>

                      <div className="relative h-5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500/40 to-purple-500/30"
                          style={{
                            width: `${Math.min((currentTime / (videoRef.current?.duration || 1)) * 100, 100)}%`,
                          }}
                        />

                        {comments.map((comment) => {
                          const duration = videoRef.current?.duration || 1;
                          const left = (comment.time / duration) * 100;

                          return (
                            <button
                              key={comment.id}
                              onClick={() => goToTime(comment.time)}
                              title={`תגובה ב-${formatTime(comment.time)}`}
                              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer rounded-full border-4 border-black bg-blue-400 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-150 active:scale-125"
                              style={{ left: `${left}%` }}
                            />
                          );
                        })}

                        {annotations.map((annotation) => {
                          const duration = videoRef.current?.duration || 1;
                          const left = (annotation.time / duration) * 100;

                          return (
                            <button
                              key={annotation.id}
                              onClick={() => goToTime(annotation.time)}
                              title={`סימון ב-${formatTime(annotation.time)}`}
                              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-red-500 shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-150 active:scale-125"
                              style={{ left: `${left}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="soft-enter mt-6 rounded-[32px] border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <input
                        type="text"
                        placeholder="כתוב הערה בזמן הנוכחי..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addComment();
                          }
                        }}
                        className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none transition-all duration-200 placeholder:text-zinc-600 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        onClick={addComment}
                        disabled={savingComment || !commentText.trim()}
                        className="button-pop rounded-2xl bg-white px-8 py-4 font-black text-black shadow-2xl shadow-white/10 hover:shadow-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingComment ? "שומר..." : "הוסף הערה"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="soft-enter max-h-[42vh] w-full overflow-y-auto border-t border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl lg:max-h-none lg:w-[430px] lg:border-l lg:border-t-0 lg:p-6">
                <div className="sticky top-0 z-10 mb-6 rounded-[28px] border border-white/10 bg-black/50 p-5 backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">פידבק</h2>
                      <p className="text-sm text-zinc-500">
                        תגובות לפי זמן
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black">
                      {comments.length}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {comments.length === 0 && (
                    <div className="rounded-[28px] border border-dashed border-white/15 bg-black/30 p-8 text-center text-zinc-500">
                      אין תגובות עדיין. הוסף את ההערה הראשונה מתחת לווידאו.
                    </div>
                  )}

                  {comments.map((comment) => {
                    const isActive = Math.abs(currentTime - comment.time) < 2;

                    return (
                      <div
                        key={comment.id}
                        className={`soft-enter card-pop rounded-[28px] border p-5 ${
                          isActive
                            ? "border-blue-300/60 bg-blue-500/20 shadow-2xl shadow-blue-500/10"
                            : "border-white/10 bg-black/35 hover:border-white/20"
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <button
                            onClick={() => goToTime(comment.time)}
                            className="button-pop rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-300 hover:border-blue-300/50 hover:bg-blue-500/20"
                          >
                            {formatTime(comment.time)}
                          </button>

                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="button-pop rounded-full px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 hover:text-red-200"
                          >
                            מחק
                          </button>
                        </div>

                        <p className="leading-relaxed text-zinc-200">
                          {comment.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md rounded-[40px] border border-white/10 bg-white/[0.045] p-10 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <img
                  src="/logo.png"
                  alt="flow.il"
                  className="mx-auto mb-6 h-24 w-24 object-contain drop-shadow-[0_0_32px_rgba(120,119,255,0.55)]"
                />
                <h2 className="text-3xl font-black">
                  העלה מהפאנל השמאלי
                </h2>
                <p className="mt-3 text-zinc-400">
                  גרור וידאו לפאנל הפרויקטים, או לחץ פעמיים באזור ההעלאה כדי לבחור קובץ.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
