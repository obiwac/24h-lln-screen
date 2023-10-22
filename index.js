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

	perspective(fov, aspect_ratio, near, far) {
		const scale = 1 / Math.tan(fov / 2)

		this.data[0][0] = scale / aspect_ratio
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

var mx, my
var placement

window.addEventListener("mousemove", (e) => {
	mx = e.pageX
	my = e.pageY

	placement = [mx / 30 - 30, -my / 30 + 20]
}, false)

window.addEventListener("mousedown", () => {
	console.log(placement)
}, false)

function anim(x, target, multiplier) {
	if (multiplier > 1) {
		return target
	}

	else {
		return x + (target - x) * multiplier
	}
}

function anim_vec(x, target, multiplier) {
	let vec = structuredClone(x)

	for (let i = 0; i < x.length; i++) {
		vec[i] = anim(x[i], target[i], multiplier)
	}

	return vec
}

const point_light_position = [1.0, 1.0, 0.0]
const point_light_color = [1.0, 1.0, 1.0]
const point_light_intensity = 10

class Texture {
	constructor(gl, img_path) {
		this.gl = gl
		this.tex = gl.createTexture()

		const img = new Image()

		img.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, this.tex)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

			gl.generateMipmap(gl.TEXTURE_2D)
		}

		img.src = img_path
	}

	use(uniform) {
		const slot = 0

		this.gl.activeTexture(this.gl.TEXTURE0 + slot)
		this.gl.uniform1i(uniform, slot)

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex)
	}
}

class Surf {
	constructor(big_screen, img_path) {
		this.big_screen = big_screen
		this.gl = big_screen.gl

		const verts = [ // x, y, z, u, v, nx, ny, nz
			-.5, -.5, 0, 0, 1, 0, 0, 0, // bottom left
			-.5,  .5, 0, 0, 0, 0, 0, 0, // top left
			 .5,  .5, 0, 1, 0, 0, 0, 0, // top right
			 .5, -.5, 0, 1, 1, 0, 0, 0, // bottom right
		]

		this.indices = [0, 1, 2, 2, 3, 0]

		// create quad mesh

		this.vbo = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verts), this.gl.STATIC_DRAW)

		this.ibo = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo)
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.indices), this.gl.STATIC_DRAW)

		// create texture

		this.texture = new Texture(this.gl, img_path)
	}

	draw() {
		// this.big_screen.fullbright_shader.use()
		this.texture.use(this.big_screen.fullbright_uniform)

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo)
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo)

		this.gl.enableVertexAttribArray(0)
		this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, this.gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 0)

		this.gl.enableVertexAttribArray(1)
		this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, this.gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 3)

		this.gl.enableVertexAttribArray(2)
		this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, this.gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 5)

		this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, this.gl.UNSIGNED_BYTE, 0)
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
		gl.vertexAttribPointer(1, 2, gl.FLOAT, gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 3)

		gl.enableVertexAttribArray(2)
		gl.vertexAttribPointer(2, 3, gl.FLOAT, gl.FALSE, FLOAT32_SIZE * 8, FLOAT32_SIZE * 5)

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

	uniform(name) {
		return this.gl.getUniformLocation(this.program, name)
	}

	use() {
		this.gl.useProgram(this.program)
	}
}

class Dvd {
	constructor(big_screen) {
		this.big_screen = big_screen
		this.gl = big_screen.gl
		this.shader = new Shader(this.gl, "kap")

		this.model_uniform = this.shader.uniform("u_model")
		this.vp_uniform = this.shader.uniform("u_vp")

		this.point_light_position_uniform = this.shader.uniform("u_pl_pos")
		this.point_light_color_uniform = this.shader.uniform("u_pl_color")
		this.point_light_intensity_uniform = this.shader.uniform("u_pl_intensity")

		this.time_uniform = this.shader.uniform("u_time")

		this.rainbow_uniform = this.shader.uniform("u_rainbow")
		this.rainbow = false;
		this.rainbow_duration = 5
		this.rainbow_timer = 0

		this.fov = TAU / 4
		this.model = new Model(this.gl, kap_model)

		this.x = 0
		this.y = 0

		this.theta = TAU / 6
	}

	keypress(key) {
		if (key === "f") {

			this.cheat = true;
			return true
		}

		return false
	}

	get_angle_from_corner(x, y, a, b) {
		const target_x  = a
		const target_y = b

		const dx = target_x - x
		const dy = target_y - y

		return Math.atan2(dy,dx)
	}

	get_corner_from_pos(x, y) { // maybe check the side ?
		if(x >= 0 && y >= 0) { // -1, -1
			console.log("fff")
			return this.get_angle_from_corner(x, y, -1, -1)

		} else if (x >= 0 && y <= 0) { // -1, 1
			console.log("hmmm")
			return this.get_angle_from_corner(x, y, -1, 1)
		} else if (x <= 0 && y >= 0) { // 1, -1
			console.log("la")
			return this.get_angle_from_corner(x, y, 1, -1)
		} else if (x <= 0 && y <= 0) { // 1, 1
			console.log("ici")
			return this.get_angle_from_corner(x, y,1.411239925376446, 0.7680795538927401)
		}
	}

	render(dt, _time) {
		const dist = 15
		const scale = 2
		const frustum_slope = Math.tan(this.fov / 2)
		this.rainbow_timer -= dt;

		// find where we should move the logo and handle bouncing off edges
		// TODO lighting
		// TODO changing colours
		// TODO cool little rotation animation each time the logo hits an edge
		// TODO cycle through colours of the rainbow when we hit corner

		const vx = Math.cos(this.theta)
		const vy = Math.sin(this.theta)

		this.x += vx * dt * 0.7
		this.y += vy * dt * 0.7

		const ar = this.big_screen.aspect_ratio

		if (
			this.y > 1 - scale * this.model.max_y / frustum_slope / dist ||
			this.y < -1 - scale * this.model.min_y / frustum_slope / dist
		) {
			console.log("hit at: ", this.x, this.y)

			if (
				this.x > ar - scale * this.model.max_x / frustum_slope / dist ||
				this.x < -ar - scale * this.model.min_x / frustum_slope / dist
			) {
				this.rainbow = 1
				this.rainbow_timer = this.rainbow_duration
			}

			this.theta = -this.theta
			if (this.cheat) {
				this.theta = this.get_corner_from_pos(this.x, this.y, ar)
				this.cheat = false
			}
		}

		if (
			this.x > ar - scale * this.model.max_x / frustum_slope / dist ||
			this.x < -ar - scale * this.model.min_x / frustum_slope / dist
		) {
			console.log("hit at: ", this.x, this.y)
			this.theta = TAU / 2 - this.theta
			if (this.cheat) {
				this.theta = this.get_corner_from_pos(this.x, this.y, ar)
				this.cheat = false
			}
		}

		if (this.rainbow_timer <= 0) {
			this.rainbow = 0
		}

		// matrix stuff

		const proj_matrix = new Matrix()
		proj_matrix.perspective(this.fov, this.big_screen.aspect_ratio, 2, 20)

		const view_matrix = new Matrix()
		view_matrix.translate(0, 0, -dist)

		const vp_matrix = new Matrix(view_matrix)
		vp_matrix.multiply(proj_matrix)

		const model_matrix = new Matrix(identity)
		model_matrix.translate(this.x * frustum_slope * dist, this.y * frustum_slope * dist, 0)
		model_matrix.scale(scale, scale, scale / 2)

		// actual rendering

		this.shader.use()


		this.gl.uniformMatrix4fv(this.vp_uniform, false, vp_matrix.data.flat())
		this.gl.uniformMatrix4fv(this.model_uniform, false, model_matrix.data.flat())
		this.gl.uniform3f(this.point_light_position_uniform, ...point_light_position)
		this.gl.uniform3f(this.point_light_color_uniform, ...point_light_color)
		this.gl.uniform1f(this.point_light_intensity_uniform, point_light_intensity)
		this.gl.uniform1f(this.time_uniform, _time)
		this.gl.uniform1i(this.rainbow_uniform, this.rainbow)

		this.model.draw(this.gl)
	}
}

class Radio {
	constructor(big_screen) {
		this.big_screen = big_screen
		this.gl = big_screen.gl

		this.model = new Model(this.gl, radio_model)
		this.texture = new Texture(this.gl, "res/radio.png")

		this.logo = new Surf(big_screen, "res/radio-logo.png")

		this.pos = [-8.2, -9.4, 0]
		this.target_pos = structuredClone(this.pos)

		this.rot = [0, 0]
		this.target_rot = structuredClone(this.rot)

		this.logo_pos = [-12.2, 8.1, -5]
		this.target_logo_pos = structuredClone(this.logo_pos)
	}

	enable() {
		this.pos = [0, 0, 15]

		this.rot = [0, TAU / 8]
		this.target_rot = [0, 0]

		this.logo_pos = [-12.2, 15, -7]
	}

	render(dt, _time) {
		const proj_matrix = new Matrix()
		proj_matrix.perspective(TAU / 4, this.big_screen.aspect_ratio, 2, 50)

		const view_matrix = new Matrix()
		view_matrix.translate(0, 0, -15)

		const vp_matrix = new Matrix(view_matrix)
		vp_matrix.multiply(proj_matrix)

		this.big_screen.fullbright_shader.use()
		this.gl.uniformMatrix4fv(this.big_screen.fullbright_vp_uniform, false, vp_matrix.data.flat())

		// render radio

		{
			this.pos = anim_vec(this.pos, this.target_pos, dt * 3)
			this.rot = anim_vec(this.rot, this.target_rot, dt * 3)

			this.target_rot[0] += dt

			const model_mat = new Matrix(identity)
			model_mat.translate(...this.pos)
			model_mat.scale(50, 50, 50)
			model_mat.rotate_2d(...this.rot)
			this.gl.uniformMatrix4fv(this.big_screen.fullbright_model_uniform, false, model_mat.data.flat())

			this.texture.use(this.big_screen.fullbright_texture_uniform)
			this.model.draw(this.gl)
		}

		// render logo

		{
			this.logo_pos = anim_vec(this.logo_pos, this.target_logo_pos, dt * 3)

			const model_mat = new Matrix(identity)
			model_mat.translate(...this.logo_pos)
			model_mat.scale(40, 25, 10)
			this.gl.uniformMatrix4fv(this.big_screen.fullbright_model_uniform, false, model_mat.data.flat())

			this.logo.draw(this.gl)
		}
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

class Infeau extends Video {
	constructor() {
		super()
		this.video = document.getElementById("infeau-video")
	}
}

class Decompte extends Video {
	constructor(){
		super()
		this.video = document.getElementById("decompte-video")
	}
}

// map of state names to HTML overlay element's id

const OVERLAYS = {
	"cse": "cse-warning",
	"cse-edit": "cse-edit-warning",
	"bsod": "bsod",
	"guindaille": "guindaille",
	"sacha": "sacha",
	"infeau": "infeau",
	"decompte": "decompte",
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
		this.aspect_ratio = this.x_res / this.y_res

		this.gl.viewport(0, 0, this.x_res, this.y_res)

		this.gl.enable(this.gl.DEPTH_TEST)
		// this.gl.enable(this.gl.CULL_FACE)

		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		// surface shader

		this.fullbright_shader = new Shader(this.gl, "fullbright")

		this.fullbright_model_uniform = this.fullbright_shader.uniform("u_model")
		this.fullbright_vp_uniform = this.fullbright_shader.uniform("u_vp")
		this.fullbright_texture_uniform = this.fullbright_shader.uniform("u_tex")

		// different states
		// - dvd: bouncing DVD "KAP" logo (default)
		// - cse: warning or message issued by the CSE Animations

		this.state = "dvd"

		this.states = {
			"dvd": new Dvd(this),
			"cse": new Cse(),
			"cse-edit": new CseEdit(),
			"guindaille": new Guindaille(),
			"sacha": new Sacha(),
			"infeau": new Infeau(),
			"radio": new Radio(this),
			"decompte": new Decompte(),
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
		else if (key === "i") this.state = "infeau"
		else if (key === "r") this.state = "radio"
		else if (key === "d") this.state = "decompte"
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

		else if (this.state === "radio") {
			colour = [0.816, 0.383, 0.328]
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
