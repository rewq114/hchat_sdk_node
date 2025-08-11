# SDK 배포 가이드

## 1. NPM 배포 준비

### 1.1 NPM 계정 생성

```bash
# NPM 계정이 없다면 생성
npm adduser

# 이미 계정이 있다면 로그인
npm login
```

### 1.2 패키지 이름 확인

```bash
# 패키지 이름이 사용 가능한지 확인
npm view @rewq114/h-chat-sdk
```

## 2. 배포 전 체크리스트

### 2.1 버전 관리

```bash
# 버전 업데이트 (patch/minor/major)
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.1 -> 0.2.0
npm version major  # 0.2.0 -> 1.0.0
```

### 2.2 빌드 및 테스트

```bash
# 클린 빌드
npm run clean
npm run build

# 테스트 실행
npm test

# 배포될 파일 확인
npm pack --dry-run
```

## 3. NPM에 배포

### 3.1 첫 배포

```bash
# 공개 패키지로 배포
npm publish --access public

# 스코프 패키지인 경우 (@org/package)
npm publish --access public
```

### 3.2 업데이트 배포

```bash
# 버전 업데이트 후
npm version patch
npm publish
```

## 4. GitHub 저장소 설정

### 4.1 저장소 생성 및 푸시

```bash
# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/rewq114/hchat_sdk_node.git
git branch -M main
git push -u origin main
```

### 4.2 GitHub Release 생성

1. GitHub 저장소로 이동
2. "Releases" 탭 클릭
3. "Create a new release" 클릭
4. 태그 버전 입력 (예: v0.1.0)
5. 릴리즈 노트 작성

## 5. 문서화

### 5.1 README 업데이트

- 설치 방법
- 사용 예제
- API 문서
- 라이선스 정보

### 5.2 변경 사항 문서화

```markdown
# CHANGELOG.md 생성

## [0.1.0] - 2024-01-XX

### Added

- 초기 릴리즈
- OpenAI, Claude, Gemini 지원
- 스트리밍 지원
- TypeScript 지원
```

## 6. 사용자를 위한 설치 가이드

배포 후 사용자는 다음과 같이 설치할 수 있습니다:

```bash
# NPM
npm install @rewq114/h-chat-sdk

# Yarn
yarn add @rewq114/h-chat-sdk

# PNPM
pnpm add @rewq114/h-chat-sdk
```

## 7. 배포 후 관리

### 7.1 버전 태그

```bash
# Git 태그 생성
git tag -a v0.1.0 -m "Initial release"
git push origin v0.1.0
```

### 7.2 CI/CD 설정 (선택사항)

GitHub Actions를 사용한 자동 배포:

```yaml
# .github/workflows/publish.yml
name: Publish to NPM
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## 8. 베스트 프랙티스

1. **Semantic Versioning** 준수

   - MAJOR: 호환되지 않는 API 변경
   - MINOR: 하위 호환 기능 추가
   - PATCH: 하위 호환 버그 수정

2. **Pre-release 버전** 사용

   ```bash
   npm version prerelease --preid=beta
   npm publish --tag beta
   ```

3. **Deprecation 관리**

   - 기능 제거 전 최소 1개 메이저 버전에서 deprecation 경고

4. **보안**
   - `.npmignore` 확인
   - 민감한 정보 제외
   - 의존성 취약점 검사: `npm audit`
