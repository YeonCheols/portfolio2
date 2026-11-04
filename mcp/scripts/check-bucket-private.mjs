// 배포 뒤 점검: 이력서 디버깅 원문이 있는 Storage 버킷이 비공개인지 확인한다.
// 사용: pnpm build 후 `pnpm check:storage` (개발) 또는 `pnpm check:storage:prod` (운영)
import { createSupabaseStorage } from "../dist/storage/supabaseStorage.js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`MISSING_ENV ${name}`);
    process.exit(2);
  }
  return value;
};

const storage = createSupabaseStorage({
  url: required("SUPABASE_URL"),
  secretKey: required("SUPABASE_SECRET_KEY"),
  bucket: required("MCP_STORAGE_BUCKET"),
});

try {
  await storage.assertBucketPrivate();
  console.log("OK 버킷이 비공개입니다.");
} catch (error) {
  // 오류 객체 전체를 출력하면 주소나 키가 섞일 수 있어 코드만 남긴다
  console.error(`FAIL ${error?.code ?? "STORAGE_BUCKET_CHECK_FAILED"}`);
  process.exit(1);
}
