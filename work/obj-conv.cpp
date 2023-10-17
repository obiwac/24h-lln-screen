// This Source Form is subject to the terms of the MOOdle OOpen Dairy LicensE, v. 1.0.
// Copyright (c) 2022 Aymeric Wibo

// based off of an OBJ to IVX converter for the Louvain-li-Nux 2022 gamejam (https://github.com/obiwac/lln-gamejam-2022/blob/main/obj-to-ivx/main.cpp), which itself was based off of an old converter of mine (https://github.com/inobulles/obj-to-ivx)
// this frankly isn't super clean C++ code, but it doesn't really need to be, as it's only meant to be run once

// the point of this utility in the context of the project is to convert from the OBJ 3D model format (which is actually kind of crappy, no idea why it's so prevalent) into something which can be easily read into a vertex buffer object without significant client-side processing in JS
// more technically, this lays out all vertex attributes together side-by-side in memory (for more efficient access)
// also, it matches up the indices for vertex positions, texture coordinates, and vertex normals into a single list of indices

// compile with:
// % c++ obj-conv.cpp -o obj-conv -L/usr/local/lib -I/usr/local/include
// usage:
// meh I'm sure you'll figure it out

#include <stdio.h>
#include <stdlib.h>
#include <vector>
#include <string>
#include <string.h>
#include <map>

#include <glm/glm.hpp>
using namespace glm;

bool load_obj(const char* path, std::vector<glm::vec3>& out_vertices, std::vector<glm::vec2>& out_coords, std::vector<glm::vec3>& out_normals) {
	std::vector<uint32_t> vertex_indices;
	std::vector<uint32_t> coords_indices;
	std::vector<uint32_t> normal_indices;

	std::vector<glm::vec3> temp_vertices;
	std::vector<glm::vec2> temp_coords;
	std::vector<glm::vec3> temp_normals;

	FILE* file = fopen(path, "r");
	if (file == NULL) {
		printf("ERROR Failed to open OBJ file\n");
		return true;
	}

	while (1) {
		char line_header[128];

		if (fscanf(file, "%s", line_header) == EOF) {
			break;

		} else if (strcmp(line_header, "v") == 0) {
			glm::vec3 vertex;
			fscanf(file, "%f %f %f\n", &vertex.x, &vertex.y, &vertex.z);
			temp_vertices.push_back(vertex);

		} else if (strcmp(line_header, "vt") == 0) {
			glm::vec2 coords;
			fscanf(file, "%f %f\n", &coords.x, &coords.y);
			coords.y = 1.0f - coords.y;
			temp_coords.push_back(coords);

		} else if (strcmp(line_header, "vn") == 0) {
			glm::vec3 normal;
			fscanf(file, "%f %f %f\n", &normal.x, &normal.y, &normal.z);
			temp_normals.push_back(normal);

		} else if (strcmp(line_header, "f") == 0) { // only works for triangles
			std::string vertex1;
			std::string vertex2;
			std::string vertex3;

			uint32_t vertex_index[3];
			uint32_t coords_index[3];
			uint32_t normal_index[3];

			if (fscanf(file, "%d/%d/%d %d/%d/%d %d/%d/%d\n", &vertex_index[0], &coords_index[0], &normal_index[0], &vertex_index[1], &coords_index[1], &normal_index[1], &vertex_index[2], &coords_index[2], &normal_index[2]) != 9) {
				printf("ERROR OBJ file could not be read, try exporting with different options\n");
				return true;
			}

			vertex_indices.push_back(vertex_index[0]);
			vertex_indices.push_back(vertex_index[1]);
			vertex_indices.push_back(vertex_index[2]);

			coords_indices.push_back(coords_index[0]);
			coords_indices.push_back(coords_index[1]);
			coords_indices.push_back(coords_index[2]);

			normal_indices.push_back(normal_index[0]);
			normal_indices.push_back(normal_index[1]);
			normal_indices.push_back(normal_index[2]);

		} else {
			char temp[1024];
			fgets(temp, sizeof(temp), file);
		}
	}

	for (uint32_t i = 0; i < vertex_indices.size(); i++) {
		uint32_t vertex_index = vertex_indices[i];
		uint32_t coords_index = coords_indices[i];
		uint32_t normal_index = normal_indices[i];

		glm::vec3 vertex = temp_vertices[vertex_index - 1];
		glm::vec2 coords = temp_coords  [coords_index - 1];
		glm::vec3 normal = temp_normals [normal_index - 1];

		out_vertices.push_back(vertex);
		out_coords  .push_back(coords);
		out_normals .push_back(normal);
	}

	return false;
}

#define EPISLON 0.01f

bool is_near(float x, float y) {
	return fabs(x - y) < EPISLON;
}

struct packed_vertex_s {
	glm::vec3 vertex;
	glm::vec2 coords;
	glm::vec3 normal;

	bool operator < (const packed_vertex_s that) const {
		return memcmp((void*) this, (void*) &that, sizeof(packed_vertex_s)) > 0;
	};
};

bool get_similar_vertex_index(packed_vertex_s& packed, std::map<packed_vertex_s, uint32_t>& vertex_to_out_index, uint32_t& result) {
	std::map<packed_vertex_s, uint32_t>::iterator iter = vertex_to_out_index.find(packed);

	if (iter == vertex_to_out_index.end()) {
		return false;

	} else {
		result = iter->second;
		return true;
	}
}

void index_vbo(std::vector<glm::vec3>& in_vertices, std::vector<glm::vec2>& in_coords, std::vector<glm::vec3>& in_normals, std::vector<uint32_t>& out_indices, std::vector<glm::vec3>& out_vertices, std::vector<glm::vec2>& out_coords, std::vector<glm::vec3>& out_normals) {
	std::map<packed_vertex_s, uint32_t> vertex_to_out_index;

	for (uint32_t i = 0; i < in_vertices.size(); i++) {
		packed_vertex_s packed = { .vertex = in_vertices[i], .coords = in_coords[i], .normal = in_normals[i] };
		uint32_t index;

		if (get_similar_vertex_index(packed, vertex_to_out_index, index)) {
			out_indices.push_back(index);

		} else {
			out_vertices.push_back(in_vertices[i]);
			out_coords  .push_back(in_coords  [i]);
			out_normals .push_back(in_normals [i]);

			uint32_t new_index = (uint32_t) out_vertices.size() - 1;
			out_indices.push_back(new_index);
			vertex_to_out_index[packed] = new_index;
		}
	}
}

int main(int argc, char* argv[]) {
	if (argc < 2) {
		printf("ERROR You must specify which Wavefront file you want to convert\n");
		return 1;
	}

	std::vector<glm::vec3> vertices;
	std::vector<glm::vec2> coords;
	std::vector<glm::vec3> normals;

	printf("Opening OBJ file (%s) ...\n", argv[1]);
	if (load_obj(argv[1], vertices, coords, normals)) {
		printf("ERROR An error occurred while attempting to read OBJ file\n");
		return 1;

	} else {
		printf("Opened OBJ file, indexing ...\n");
	}

	std::vector<glm::vec3> indexed_vertices;
	std::vector<glm::vec2> indexed_coords;
	std::vector<glm::vec3> indexed_normals;

	std::vector<uint32_t> indices;
	index_vbo(vertices, coords, normals, indices, indexed_vertices, indexed_coords, indexed_normals);

	const char* out_path = argc > 2 ? argv[2] : "output.js";
	printf("OBJ file indexed, writing to file (%s) ...\n", out_path);

	FILE* out_fp = fopen(out_path, "wb");
	if (out_fp == NULL) {
		printf("ERROR Failed to open output file\n");
		return 1;
	}

	fprintf(out_fp, "var model = {\n\tindices: new Uint16Array([");

	// write indices

	for (uint32_t i = 0; i < indices.size(); i++) {
		uint32_t data = indices[i];
		fprintf(out_fp, "%u,", data);
	}

	fprintf(out_fp, "]),\n\tvertices: new Float32Array([");

	// write attributes

	if (indexed_vertices.size() != indexed_coords.size() or indexed_vertices.size() != indexed_normals.size()) {
		return 1;
	}

	for (uint64_t i = 0; i < indexed_vertices.size(); i++) {
		fprintf(out_fp, "%g,%g,%g,%g,%g,%g,%g,%g,",
			indexed_vertices[i].x,
			indexed_vertices[i].y,
			indexed_vertices[i].z,

			indexed_coords  [i].y,
			indexed_coords  [i].x,

			indexed_normals [i].x,
			indexed_normals [i].y,
			indexed_normals [i].z
		);
	}

	// go back and write the header

	fprintf(out_fp, "])\n}\n");
	printf("Finished converting successfully\n");

	fclose(out_fp);
	return 0;
}
