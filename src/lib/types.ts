export type ProjectsResponse = Project[];

export interface Project {
  id: number
  node_id: string
  name: string
  full_name: string
  private: boolean
  owner: Owner
  html_url: string
  description?: string
  fork: boolean
  url: string
  forks_url: string
  keys_url: string
  collaborators_url: string
  teams_url: string
  hooks_url: string
  issue_events_url: string
  events_url: string
  assignees_url: string
  branches_url: string
  tags_url: string
  blobs_url: string
  git_tags_url: string
  git_refs_url: string
  trees_url: string
  statuses_url: string
  languages_url: string
  stargazers_url: string
  contributors_url: string
  subscribers_url: string
  subscription_url: string
  commits_url: string
  git_commits_url: string
  comments_url: string
  issue_comment_url: string
  contents_url: string
  compare_url: string
  merges_url: string
  archive_url: string
  downloads_url: string
  issues_url: string
  pulls_url: string
  milestones_url: string
  notifications_url: string
  labels_url: string
  releases_url: string
  deployments_url: string
  created_at: string
  updated_at: string
  pushed_at: string
  git_url: string
  ssh_url: string
  clone_url: string
  svn_url: string
  homepage?: string
  size: number
  stargazers_count: number
  watchers_count: number
  language: string
  has_issues: boolean
  has_projects: boolean
  has_downloads: boolean
  has_wiki: boolean
  has_pages: boolean
  has_discussions: boolean
  forks_count: number
  mirror_url: any
  archived: boolean
  disabled: boolean
  open_issues_count: number
  license?: License
  allow_forking: boolean
  is_template: boolean
  web_commit_signoff_required: boolean
  repositoryTopics: { nodes: { topic: { name: string } } []}
  visibility: string
  forks: number
  open_issues: number
  watchers: number
  default_branch: string
  download_url?: string
  description_md: string
}

export interface Owner {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  user_view_type: string
  site_admin: boolean
}

export interface License {
  key: string
  name: string
  spdx_id: string
  url: string
  node_id: string
}

export interface Course {
    "Course ID": string;
    "Course Name": string;
    "Program Name": string;
    "Start Date": string;
    "Description": string;
    "Professor": string;
    "Location": string;
}

export interface Program {
    "Program Name": string;
    "Location": string;
    "Organization": string;
    "Start": string;
    "End": string;
    "Program Description": string;
    "Events": Course[];
}

export interface PhotosResponse {
  kind: string
  etag: string
  selfLink: string
  incompleteSearch: boolean
  items: Photo[]
}

export interface Photo {
  kind: string
  userPermission: UserPermission
  fileExtension: string
  md5Checksum: string
  selfLink: string
  ownerNames: string[]
  lastModifyingUserName: string
  editable: boolean
  writersCanShare: boolean
  downloadUrl: string
  mimeType: string
  parents: Parent[]
  thumbnailLink: string
  appDataContents: boolean
  iconLink: string
  shared: boolean
  lastModifyingUser: LastModifyingUser
  owners: Owner[]
  headRevisionId: string
  copyable: boolean
  etag: string
  alternateLink: string
  embedLink: string
  webContentLink: string
  fileSize: string
  copyRequiresWriterPermission: boolean
  spaces: string[]
  id: string
  title: string
  labels: Labels
  explicitlyTrashed: boolean
  createdDate: string
  modifiedDate: string
  markedViewedByMeDate: string
  quotaBytesUsed: string
  version: string
  originalFilename: string
  capabilities: Capabilities
  imageMediaMetadata: ImageMediaMetadata
}

export interface UserPermission {
  id: string
  type: string
  role: string
  kind: string
  selfLink: string
  etag: string
  pendingOwner: boolean
}

export interface Parent {
  selfLink: string
  id: string
  isRoot: boolean
  kind: string
  parentLink: string
}

export interface LastModifyingUser {
  displayName: string
  kind: string
  isAuthenticatedUser: boolean
  permissionId: string
  emailAddress: string
  picture: Picture
}

export interface Picture {
  url: string
}

export interface Owner {
  displayName: string
  kind: string
  isAuthenticatedUser: boolean
  permissionId: string
  emailAddress: string
  picture: Picture2
}

export interface Picture2 {
  url: string
}

export interface Labels {
  viewed: boolean
  restricted: boolean
  starred: boolean
  hidden: boolean
  trashed: boolean
}

export interface Capabilities {
  canEdit: boolean
  canCopy: boolean
}

export interface ImageMediaMetadata {
  flashUsed?: boolean
  meteringMode?: string
  exposureMode?: string
  colorSpace?: string
  whiteBalance?: string
  width: number
  height: number
  rotation: number
  date?: string
  cameraMake?: string
  cameraModel?: string
  exposureTime?: number
  aperture?: number
  focalLength?: number
  isoSpeed?: number
  exposureBias?: number
  maxApertureValue?: number
  lens?: string
}