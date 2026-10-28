export async function downloadResumePdf(resumeId: string, fileName: string): Promise<void> {
  const response = await fetch('/eleva/api/export/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId }),
  });
  if (!response.ok) throw new Error('Failed to download resume PDF');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
