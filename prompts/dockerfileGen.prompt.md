Read the files of the package "{{PACKAGE_NAME}}" and generate a Dockerfile for it.
Base it on the application's start command and the package structure.

Reply ONLY with the Dockerfile content, no explanations, no markdown, no code blocks.

package.json:
{{PACKAGE_JSON}}

File structure:
{{FILE_STRUCTURE}}

Requirements:
- Base image: oven/bun:latest
- Exposed port: 8080 (important: check if the project uses a different port, and if so change it to the correct port)
- Install dependencies with: bun install --frozen-lockfile --production
- If there is a build script in package.json, run it before CMD
- The CMD should start the application using the correct entrypoint of the package (e.g. the start script from package.json, such as bun run start)
- The CMD command should be generated with attention to details like: bun run file.html does not serve the file on port 8080, you need to use bun file.html --host=0.0.0.0 --port=8080 so the container exposes the application correctly on port 8080 and is accessible externally)
