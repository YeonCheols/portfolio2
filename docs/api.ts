/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ProjectResponse {
  /** 프로젝트 ID */
  id: number;
  /** 프로젝트 제목 */
  title: string;
  /** 프로젝트 슬러그 */
  slug: string;
  /** 프로젝트 설명 */
  description: string;
  /** 프로젝트 메인 이미지 */
  image: string;
  /** 프로젝트 기술 스택 */
  stacks: string;
  /** 프로젝트 상세 내용 */
  content: string;
  /** 프로젝트 노출 여부 */
  isShow: boolean;
  /** 프로젝트 데모 링크 */
  linkDemo: string;
  /** 프로젝트 GitHub 링크 */
  linkGithub: string;
  /** 프로젝트 정렬 순서 */
  order: number;
  /**
   * 프로젝트 업데이트 일자
   * @format date-time
   */
  updatedAt: string;
}

export interface ProjectSearchResponse {
  /** 프로젝트 목록 */
  data: ProjectResponse[];
  /** 프로젝트 총 개수 */
  total: number;
  /** 전체 프로젝트 개수 */
  allTotal: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 당 프로젝트 수 */
  size: number;
}

export interface ProjectTagResponse {
  /** 태그 ID */
  id: number;
  /** 태그 이름 */
  name: string;
  /** 태그 아이콘 */
  icon: string;
  /** 태그 색상 */
  color: string;
  /**
   * 태그 카테고리
   * @example "frontend"
   */
  category: "frontend" | "backend" | "database" | "devops" | "tool" | "other";
  /**
   * 업데이트 시간
   * @format date-time
   */
  updatedAt: string;
}

export interface ProjectByTagResponse {
  /** 프로젝트 ID */
  id: number;
  /** 프로젝트 제목 */
  title: string;
  /** 프로젝트 슬러그 */
  slug: string;
  /** 프로젝트 설명 */
  description: string;
  /** 프로젝트 메인 이미지 */
  image: string;
  /** 프로젝트 기술 스택 */
  stacks: string;
  /** 프로젝트 상세 내용 */
  content: string;
  /** 프로젝트 노출 여부 */
  isShow: boolean;
  /** 프로젝트 데모 링크 */
  linkDemo: string;
  /** 프로젝트 GitHub 링크 */
  linkGithub: string;
  /** 프로젝트 정렬 순서 */
  order: number;
  /**
   * 프로젝트 업데이트 일자
   * @format date-time
   */
  updatedAt: string;
  /** 프로젝트 태그 */
  projectTags: ProjectTagResponse[];
}

export interface ProfileResponse {
  /**
   * 프로필 ID
   * @example 1
   */
  id: number;
  /** 프로필 이름 */
  name: string;
  /**
   * 프로필 이미지 URL
   * @example "https://example.com/profile.jpg"
   */
  imageUrl: string;
  /**
   * 프로필 활성화 여부
   * @example true
   */
  isActive: boolean;
  /**
   * 프로필 순서
   * @example 1
   */
  order: number;
  /**
   * 프로필 업데이트 일자
   * @format date-time
   * @example "2025-05-29 01:30:21.469"
   */
  updatedAt: string;
}

export interface TagResponse {
  /**
   * 태그 ID
   * @example 1
   */
  id: number;
  /**
   * 태그 이름
   * @example "React"
   */
  name: string;
  /**
   * 아이콘
   * @example "react-icon"
   */
  icon: string;
  /**
   * 색상
   * @example "#61dafb"
   */
  color: string;
  /**
   * 카테고리
   * @example "frontend"
   */
  category: "frontend" | "backend" | "database" | "devops" | "tool" | "other";
  /**
   * 연결된 프로젝트 개수
   * @example 5
   */
  projectCount: number;
  /**
   * 업데이트 일자
   * @format date-time
   * @example "2025-06-30T00:00:00.000Z"
   */
  updatedAt: string;
}

export interface TagSearchResponse {
  /** 태그 목록 */
  data: TagResponse[];
  /**
   * 현재 페이지 태그 수
   * @example 10
   */
  total: number;
  /**
   * 전체 태그 수
   * @example 100
   */
  allTotal: number;
  /**
   * 현재 페이지
   * @example 1
   */
  page: number;
  /**
   * 페이지 크기
   * @example 10
   */
  size: number;
}

export interface SendMailRequest {
  /**
   * 수신자 이메일(미제공 시 기본값 사용)
   * @example "s9292909@gmail.com"
   */
  email?: string;
  /**
   * 메일 제목
   * @example "문의가 도착했습니다"
   */
  subject: string;
  /**
   * 메일 HTML 내용
   * @example "<p>안녕하세요</p>"
   */
  content: string;
}

export interface SendMailResponse {
  /**
   * 성공 여부
   * @example true
   */
  success: boolean;
}

export interface AdminProfileCreateRequest {
  /**
   * 프로필 이름
   * @example "1번 프로필"
   */
  name: string;
  /**
   * 프로필 이미지 URL
   * @example "https://example.com/profile.jpg"
   */
  imageUrl: string;
  /**
   * 프로필 활성화 여부
   * @example true
   */
  isActive?: boolean;
}

export interface AdminProfileResponse {
  /**
   * 프로필 ID
   * @example 1
   */
  id: number;
  /** 프로필 이름 */
  name: string;
  /**
   * 프로필 이미지 URL
   * @example "https://example.com/profile.jpg"
   */
  imageUrl: string;
  /**
   * 프로필 활성화 여부
   * @example true
   */
  isActive: boolean;
  /**
   * 프로필 순서
   * @example 1
   */
  order: number;
  /**
   * 프로필 업데이트 일자
   * @format date-time
   * @example "2025-05-29 01:30:21.469"
   */
  updatedAt: string;
}

export interface AdminProfileOrderUpdateRequest {
  /**
   * 프로필 고유 ID
   * @example 1
   */
  id: number;
  /**
   * 프로필 정렬 번호
   * @example 1
   */
  order: number;
}

export interface AdminProfileUpdateRequest {
  /**
   * 프로필 이름
   * @example "1번 프로필"
   */
  name?: string;
  /**
   * 프로필 이미지 URL
   * @example "https://example.com/profile.jpg"
   */
  imageUrl?: string;
  /**
   * 프로필 활성화 여부
   * @example true
   */
  isActive?: boolean;
}

export interface AdminProfileStatusUpdateRequest {
  /**
   * 프로필 노출 여부
   * @example true
   */
  isActive: boolean;
}

export interface AdminProjectCreateRequest {
  /**
   * 프로젝트 슬러그 (URL에 사용되는 고유 식별자)
   * @example "my-awesome-project"
   */
  slug: string;
  /**
   * 프로젝트 제목
   * @example "나의 멋진 프로젝트"
   */
  title: string;
  /**
   * 프로젝트 설명
   * @example "이 프로젝트는 정말 멋진 기능을 제공합니다."
   */
  description: string;
  /**
   * 프로젝트 이미지 URL
   * @example "https://example.com/image.jpg"
   */
  image: string;
  /**
   * 사용된 기술 스택
   * @example "React, Node.js, TypeScript"
   */
  stacks: string;
  /**
   * 프로젝트 상세 내용
   * @example "프로젝트에 대한 자세한 설명과 구현 내용..."
   */
  content?: string;
  /**
   * 프로젝트 데모 링크
   * @example "https://example.com"
   */
  linkDemo?: string;
  /**
   * GitHub 리포지토리 링크
   * @example "https://github.com/username/project"
   */
  linkGithub?: string;
  /**
   * 프로젝트 공개 여부
   * @default false
   * @example true
   */
  isShow?: boolean;
}

export interface AdminProjectResponse {
  /** 프로젝트 ID */
  id: number;
  /** 프로젝트 제목 */
  title: string;
  /** 프로젝트 슬러그 */
  slug: string;
  /** 프로젝트 설명 */
  description: string;
  /** 프로젝트 메인 이미지 */
  image: string;
  /** 프로젝트 기술 스택 */
  stacks: string;
  /** 프로젝트 상세 내용 */
  content: string;
  /** 프로젝트 노출 여부 */
  isShow: boolean;
  /** 프로젝트 데모 링크 */
  linkDemo: string;
  /** 프로젝트 GitHub 링크 */
  linkGithub: string;
  /** 프로젝트 정렬 순서 */
  order: number;
  /**
   * 프로젝트 업데이트 일자
   * @format date-time
   */
  updatedAt: string;
}

export interface AdminProjectSearchResponse {
  /** 프로젝트 목록 */
  data: AdminProjectResponse[];
  /** 프로젝트 총 개수 */
  total: number;
  /** 전체 프로젝트 개수 */
  allTotal: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 당 프로젝트 수 */
  size: number;
}

export interface AdminProjectOrderUpdateRequest {
  /**
   * 교환할 첫 번째 프로젝트의 고유 식별자 (slug)
   * @example "project-1"
   */
  nextSlug: string;
  /**
   * 첫 번째 프로젝트(nextSlug)가 이동할 새로운 순서 번호
   * @example 2
   */
  nextOrderNo: number;
  /**
   * 교환할 두 번째 프로젝트의 고유 식별자 (slug)
   * @example "project-2"
   */
  prevSlug: string;
  /**
   * 두 번째 프로젝트(prevSlug)가 이동할 새로운 순서 번호
   * @example 1
   */
  prevOrderNo: number;
}

export interface AdminProjectUpdateRequest {
  /**
   * 프로젝트 슬러그 (URL에 사용되는 고유 식별자)
   * @example "my-awesome-project"
   */
  slug?: string;
  /**
   * 프로젝트 제목
   * @example "나의 멋진 프로젝트"
   */
  title?: string;
  /**
   * 프로젝트 설명
   * @example "이 프로젝트는 정말 멋진 기능을 제공합니다."
   */
  description?: string;
  /**
   * 프로젝트 이미지 URL
   * @example "https://example.com/image.jpg"
   */
  image?: string;
  /**
   * 사용된 기술 스택
   * @example "React, Node.js, TypeScript"
   */
  stacks?: string;
  /**
   * 프로젝트 상세 내용
   * @example "프로젝트에 대한 자세한 설명과 구현 내용..."
   */
  content?: string;
  /**
   * 프로젝트 데모 링크
   * @example "https://example.com"
   */
  linkDemo?: string;
  /**
   * GitHub 리포지토리 링크
   * @example "https://github.com/username/project"
   */
  linkGithub?: string;
  /**
   * 프로젝트 공개 여부
   * @default false
   * @example true
   */
  isShow?: boolean;
}

export interface AdminProjectStatusUpdateRequest {
  /** 프로젝트 ID */
  slug: string;
  /** 프로젝트 노출 여부 */
  isShow: boolean;
}

export interface AdminCreateUserRequest {
  /** @example "admin@example.com" */
  email: string;
  /** @example "password123" */
  password: string;
}

export interface AdminLoginRequest {
  /** @example "admin@example.com" */
  email: string;
  /** @example "password123" */
  password: string;
}

export interface AdminLoginResponse {
  /** @example {"id":1,"email":"admin@example.com"} */
  user: object;
}

export interface AdminResetPasswordRequest {
  /** @example "admin@example.com" */
  email: string;
  /** @example "password123" */
  newPassword: string;
}

export interface AdminTagResponse {
  /**
   * 태그 ID
   * @example 1
   */
  id: number;
  /**
   * 태그 이름
   * @example "React"
   */
  name: string;
  /**
   * 아이콘
   * @example "react-icon"
   */
  icon: string;
  /**
   * 색상
   * @example "#61dafb"
   */
  color: string;
  /**
   * 카테고리
   * @example "frontend"
   */
  category: "frontend" | "backend" | "database" | "devops" | "tool" | "other";
  /**
   * 업데이트 일자
   * @format date-time
   * @example "2025-06-30T00:00:00.000Z"
   */
  updatedAt: string;
}

export interface AdminTagSearchResponse {
  /** 태그 목록 */
  data: AdminTagResponse[];
  /**
   * 현재 페이지 태그 수
   * @example 10
   */
  total: number;
  /**
   * 전체 태그 수
   * @example 100
   */
  allTotal: number;
  /**
   * 현재 페이지
   * @example 1
   */
  page: number;
  /**
   * 페이지 크기
   * @example 10
   */
  size: number;
}

export interface AdminTagCreateRequest {
  /**
   * 태그 이름
   * @example "React"
   */
  name: string;
  /**
   * 아이콘
   * @example "react-icon"
   */
  icon: string;
  /**
   * 색상
   * @example "#61dafb"
   */
  color: string;
  /**
   * 카테고리
   * @example "frontend"
   */
  category: "frontend" | "backend" | "database" | "devops" | "tool" | "other";
}

export interface AdminTagUpdateRequest {
  /**
   * 태그 이름
   * @example "React"
   */
  name?: string;
  /**
   * 아이콘
   * @example "react-icon"
   */
  icon?: string;
  /**
   * 색상
   * @example "#61dafb"
   */
  color?: string;
  /**
   * 카테고리
   * @example "frontend"
   */
  category?: "frontend" | "backend" | "database" | "devops" | "tool" | "other";
}
