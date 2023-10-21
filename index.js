// ideas
// - DVD logo, and stop just before the corner and BSOD

class Matrix {
	// matrices are all 4x4, and are initialized as the identity matrix
	// I won't comment on the code here all that much because it's pretty much just computations

	constructor(template) {
		// if we pass a template matrix, copy it
		// otherwise, initialize it to the 4x4 identity matrix

		if (template) {
			this.data = JSON.parse(JSON.stringify(template.data)) // I hate javascript 🙂
			return
		}

		this.data = [
			[1.0, 0.0, 0.0, 0.0],
			[0.0, 1.0, 0.0, 0.0],
			[0.0, 0.0, 1.0, 0.0],
			[0.0, 0.0, 0.0, 1.0],
		]
	}

	multiply(left) {
		const right = new Matrix(this)

		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				this.data[i][j] =
					left.data[0][j] * right.data[i][0] +
					left.data[1][j] * right.data[i][1] +
					left.data[2][j] * right.data[i][2] +
					left.data[3][j] * right.data[i][3]
			}
		}
	}

	scale(x, y, z) {
		for (let i = 0; i < 4; i++) {
			this.data[0][i] *= x
			this.data[1][i] *= y
			this.data[2][i] *= z
		}
	}

	translate(x, y, z) {
		for (let i = 0; i < 4; i++) {
			this.data[3][i] +=
				this.data[0][i] * x +
				this.data[1][i] * y +
				this.data[2][i] * z
		}
	}

	rotate(theta, x, y, z) {
		// theta represents the angle we want to rotate by
		// xyz represents the eigenvector of the matrix transformation of the rotation

		// normalize xyz

		const mag = Math.sqrt(x * x + y * y + z * z)

		x /= -mag
		y /= -mag
		z /= -mag

		const s = Math.sin(theta)
		const c = Math.cos(theta)
		const one_minus_c = 1 - c

		const xx = x * x, yy = y * y, zz = z * z
		const xy = x * y, yz = y * z, zx = z * x
		const xs = x * s, ys = y * s, zs = z * s

		const rotation = new Matrix()

		rotation.data[0][0] = (one_minus_c * xx) + c
		rotation.data[0][1] = (one_minus_c * xy) - zs
		rotation.data[0][2] = (one_minus_c * zx) + ys

		rotation.data[1][0] = (one_minus_c * xy) + zs
		rotation.data[1][1] = (one_minus_c * yy) + c
		rotation.data[1][2] = (one_minus_c * yz) - xs

		rotation.data[2][0] = (one_minus_c * zx) - ys
		rotation.data[2][1] = (one_minus_c * yz) + xs
		rotation.data[2][2] = (one_minus_c * zz) + c

		rotation.data[3][3] = 1

		rotation.multiply(this)
		this.data = rotation.data
	}

	rotate_2d(yaw, pitch) {
		this.rotate(yaw, 0, 1, 0)
		this.rotate(-pitch, Math.cos(yaw), 0, Math.sin(yaw))
	}

	perspective(fov, near, far) {
		const scale = 1 / Math.tan(fov / 2)

		this.data[0][0] = scale
		this.data[1][1] = scale
		this.data[2][2] = -far / (far - near)
		this.data[3][2] = -far * near / (far - near)
		this.data[2][3] = -1
		this.data[3][3] = 0
	}
}

var identity = new Matrix()
var alpha = 1

const TAU = Math.PI * 2
const FLOAT32_SIZE = 4

class Surf {
	constructor(gl, img_path) {
		this.gl = gl

		const verts = [ // x, y, u, v
			-.5, -.5, 0, 0, // bottom left
			-.5,  .5, 0, 1, // top left
			 .5,  .5, 1, 1, // top right
			 .5, -.5, 1, 0, // bottom right
		]

		this.indices = [0, 1, 2, 2, 3, 0]

		// create quad mesh

		this.vbo = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)

		this.ibo = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.indices), gl.STATIC_DRAW)

		// create texture

		this.tex = gl.createTexture()

		const img = new Image()
		img.src = img_path

		img.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, this.tex)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

			// XXX don't generate mipmaps as WebGL 1.0 can be picky about non-POT textures!!
		}
	}

	draw(render_state) {
		this.gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		this.gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)

		this.gl.enableVertexAttribArray(render_state.pos_attr)
		this.gl.vertexAttribPointer(render_state.pos_attr, 2, gl.FLOAT, FLOAT32_SIZE * 4, FLOAT32_SIZE * 0)

		this.gl.enableVertexAttribArray(render_state.tex_attr)
		this.gl.vertexAttribPointer(render_state.tex_attr, 2, gl.FLOAT, FLOAT32_SIZE * 4, FLOAT32_SIZE * 2)

		this.gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_BYTE, 0)
	}
}

class Model {
	constructor(gl, model) {
		this.vertices = model.vertices
		this.indices = model.indices

		this.max_x = 0
		this.max_y = 0

		this.min_x = 0
		this.min_y = 0

		for (let i = 0; i < this.vertices.length / 8; i++) {
			const x = this.vertices[i * 8 + 0]
			const y = this.vertices[i * 8 + 1]
			// const z = this.vertices[i * 8 + 2]

			this.vertices[i * 8 + 2] = this.vertices[i * 8 + 2] * 0.5

			this.max_x = Math.max(this.max_x, x)
			this.max_y = Math.max(this.max_y, y)

			this.min_x = Math.min(this.min_x, x)
			this.min_y = Math.min(this.min_y, y)
		}

		this.vbo = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)

		this.ibo = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW)
	}

	draw(gl) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)

		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 0)

		gl.enableVertexAttribArray(1)
		gl.vertexAttribPointer(1, 3, gl.FLOAT, gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 3)

		gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0)
	}
}

// WebGL setup

class Shader {
	constructor(gl, id) {
		this.gl = gl

		const vert_id = `${id}-vert`
		const frag_id = `${id}-frag`

		const vert_shader = this.gl.createShader(this.gl.VERTEX_SHADER)
		const frag_shader = this.gl.createShader(this.gl.FRAGMENT_SHADER)

		this.gl.shaderSource(vert_shader, document.getElementById(vert_id).innerHTML)
		this.gl.shaderSource(frag_shader, document.getElementById(frag_id).innerHTML)

		this.gl.compileShader(vert_shader)
		this.gl.compileShader(frag_shader)

		this.program = this.gl.createProgram()

		this.gl.attachShader(this.program, vert_shader)
		this.gl.attachShader(this.program, frag_shader)

		this.gl.linkProgram(this.program)

		// MDN detaches the shaders first with 'gl.detachShader'
		// I'm not really sure what purpose this serves

		this.gl.deleteShader(vert_shader)
		this.gl.deleteShader(frag_shader)

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			const log = this.gl.getProgramInfoLog(this.program)
			let vert_compilation_log = this.gl.getShaderInfoLog(vert_shader)
			let frag_compilation_log = this.gl.getShaderInfoLog(frag_shader)

			console.error(vert_compilation_log)
			console.error(frag_compilation_log)
			console.error(log)
		}
	}

	use() {
		this.gl.useProgram(this.program)
	}
}

class Dvd {
	constructor(gl) {
		this.gl = gl
		this.shader = new Shader(this.gl, "kap")

		this.model_uniform = this.gl.getUniformLocation(this.shader.program, "u_model")
		this.vp_uniform = this.gl.getUniformLocation(this.shader.program, "u_vp")

		this.fov = TAU / 4
		this.model = new Model(this.gl, kap_model)

		this.x = 0
		this.y = 0

		this.theta = TAU / 6
	}

	keypress(key) {
		if (key === "f") {
			// TODO cheat and target a corner
			// only do this on next bounce so it doesn't look too obvious the direction has changed
			// target the corner closest to where the next intersection is gonna be (simple atan2)

			return true
		}

		return false
	}

	render(dt, _time) {
		const dist = 15
		const frustum_slope = Math.tan(this.fov / 2)

		// find where we should move the logo and handle bouncing off edges
		// TODO lighting
		// TODO changing colours
		// TODO cool little rotation animation each time the logo hits an edge
		// TODO cycle through colours of the rainbow when we hit corner

		const vx = Math.cos(this.theta)
		const vy = Math.sin(this.theta)

		this.x += vx * dt * 0.3
		this.y += vy * dt * 0.3

		if (
			this.y > 1 - this.model.max_y / frustum_slope / dist ||
			this.y < -1 - this.model.min_y / frustum_slope / dist
		) {
			this.theta = -this.theta
		}

		if (
			this.x > 1 - this.model.max_x / frustum_slope / dist ||
			this.x < -1 - this.model.min_x / frustum_slope / dist
		) {
			this.theta = TAU / 2 - this.theta
		}

		// matrix stuff

		const proj_matrix = new Matrix()
		proj_matrix.perspective(this.fov, 2, 20)

		const view_matrix = new Matrix()

		view_matrix.translate(0, 0, -dist)

		const vp_matrix = new Matrix(view_matrix)
		vp_matrix.multiply(proj_matrix)

		const model_matrix = new Matrix(identity)
		model_matrix.translate(this.x * frustum_slope * dist, this.y * frustum_slope * dist, 0)

		// actual rendering

		this.shader.use()

		this.gl.uniformMatrix4fv(this.vp_uniform, false, vp_matrix.data.flat())
		this.gl.uniformMatrix4fv(this.model_uniform, false, model_matrix.data.flat())

		this.model.draw(this.gl)
	}
}

class Cse {
	constructor() {
		this.warning_text = document.getElementById("cse-warning-text")
		this.warning_input = document.getElementById("cse-warning-input")
	}

	enable() {
		this.warning_text.innerText = this.warning_input.value
	}
}

class CseEdit {
	keypress(_key) {
		// always ignore key presses if modifying CSE warning message

		return true
	}
}

class Video {
	enable() {
		this.video.currentTime = 0
		this.video.play()
	}

	disable() {
		this.video.pause()
	}
}

class Guindaille extends Video {
	constructor() {
		super()
		this.video = document.getElementById("guindaille-video")
	}
}

// TODO make custom visual for this?

class Sacha extends Video {
	constructor() {
		super()
		this.video = document.getElementById("sacha-video")
	}
}

// map of state names to HTML overlay element's id

const OVERLAYS = {
	"cse": "cse-warning",
	"cse-edit": "cse-edit-warning",
	"bsod": "bsod",
	"guindaille": "guindaille",
	"sacha": "sacha",
}

class BigScreen {
	constructor() {
		// WebGL setup

		const canvas = document.getElementById("canvas")
		this.gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl")

		if (!this.gl || (!(this.gl instanceof WebGLRenderingContext) && !(this.gl instanceof WebGL2RenderingContext))) {
			canvas.hidden = true
			return
		}

		this.x_res = this.gl.drawingBufferWidth
		this.y_res = this.gl.drawingBufferHeight

		this.gl.viewport(0, 0, this.x_res, this.y_res)

		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.enable(this.gl.CULL_FACE)

		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		// different states
		// - dvd: bouncing DVD "KAP" logo (default)
		// - cse: warning or message issued by the CSE Animations

		this.state = "dvd"

		this.states = {
			"dvd": new Dvd(this.gl),
			"cse": new Cse(),
			"cse-edit": new CseEdit(),
			"guindaille": new Guindaille(),
			"sacha": new Sacha(),
		}

		window.addEventListener("keypress", e => {
			// make sure the current state doesn't handle this key

			const state = this.states[this.state]

			if (state && state.keypress && state.keypress(e.key)) {
				return
			}

			this.change_state(e.key)
		})

		// loop

		this.prev = 0
		requestAnimationFrame(now => this.render(now))
	}

	change_state(key) {
		// disable overlay of previous state

		if (OVERLAYS[this.state]) {
			const overlay = document.getElementById(OVERLAYS[this.state])
			overlay.hidden = true
		}

		// disable previous state

		{
			const state = this.states[this.state]

			if (state && state.disable) {
				state.disable()
			}
		}

		// set new state

		if (key === "e") this.state = "cse-edit"
		else if (key === "c") this.state = "cse"
		else if (key === "b") this.state = "bsod"
		else if (key === "g") this.state = "guindaille"
		else if (key === "s") this.state = "sacha"
		else this.state = "dvd"

		// enable new state

		{
			const state = this.states[this.state]

			if (state && state.enable) {
				state.enable()
			}
		}

		// enable overlay of new state

		if (OVERLAYS[this.state]) {
			const overlay = document.getElementById(OVERLAYS[this.state])
			overlay.hidden = false
		}
	}

	render(now) {
		const dt = (now - this.prev) / 1000
		this.prev = now

		if (dt > 1 / 10) { // skip frame if slower than 10 FPS
			requestAnimationFrame(now => this.render(now))
			return
		}

		const time = now / 1000

		let colour = [0, 0, 0]

		if (this.state === "cse") {
			colour = [1, 1, 0]
		}

		this.gl.clearColor(...colour, 1)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

		const state = this.states[this.state]

		if (state && state.render) {
			state.render(dt, time)
		}

		requestAnimationFrame(now => this.render(now))
	}
}

var big_screen

window.addEventListener("load", () => {
	big_screen = new BigScreen()
}, false)
