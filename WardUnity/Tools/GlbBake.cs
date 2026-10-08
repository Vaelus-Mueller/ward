using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

namespace Ward.Tools
{
    /// <summary>
    /// Bakes a GLB into a static OBJ (bind-pose skinning) plus PNG textures.
    /// Unity has no built-in glTF importer, and extra packages have failed to compile on this editor.
    /// </summary>
    public static class GlbBake
    {
        public static string Export(string glbPath, string objPath, string assetName, string[] skipContains)
        {
            var file = File.ReadAllBytes(glbPath);
            if (file.Length < 20 || BitConverter.ToUInt32(file, 0) != 0x46546C67)
                throw new InvalidDataException("Not a GLB: " + glbPath);

            int jsonLen = BitConverter.ToInt32(file, 12);
            string json = Encoding.UTF8.GetString(file, 20, jsonLen).TrimEnd('\0', ' ');
            int binChunk = 20 + jsonLen;
            int binLen = BitConverter.ToInt32(file, binChunk);
            int bin = binChunk + 8;

            var ser = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
            var root = (Dictionary<string, object>)ser.DeserializeObject(json);
            var nodes = ListOf(root, "nodes");
            var meshes = ListOf(root, "meshes");
            var accessors = ListOf(root, "accessors");
            var views = ListOf(root, "bufferViews");
            var skins = root.ContainsKey("skins") ? ListOf(root, "skins") : new List<object>();
            var materials = root.ContainsKey("materials") ? ListOf(root, "materials") : new List<object>();
            var textures = root.ContainsKey("textures") ? ListOf(root, "textures") : new List<object>();
            var images = root.ContainsKey("images") ? ListOf(root, "images") : new List<object>();

            int nCount = nodes.Count;
            var parents = new int[nCount];
            for (int i = 0; i < nCount; i++) parents[i] = -1;
            for (int i = 0; i < nCount; i++)
            {
                var node = Dict(nodes[i]);
                if (!node.ContainsKey("children")) continue;
                foreach (var child in ListOf(node, "children"))
                    parents[Convert.ToInt32(child)] = i;
            }

            var worlds = new double[nCount][];
            for (int i = 0; i < nCount; i++)
                worlds[i] = World(i, nodes, parents, worlds);

            var dir = Path.GetDirectoryName(objPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            var imageFiles = new Dictionary<int, string>();
            var sb = new StringBuilder();
            var inv = CultureInfo.InvariantCulture;
            sb.Append("mtllib ").Append(assetName).AppendLine(".mtl");

            int vBase = 1;
            double minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
            int vertCount = 0;
            int triCount = 0;
            var usedMats = new SortedSet<int>();

            for (int ni = 0; ni < nCount; ni++)
            {
                var node = Dict(nodes[ni]);
                if (!node.ContainsKey("mesh")) continue;
                string name = node.ContainsKey("name") ? Convert.ToString(node["name"]) : "";
                if (Skip(name, skipContains)) continue;

                bool skinned = node.ContainsKey("skin");
                double[][] pal = null;
                if (skinned)
                {
                    var skin = Dict(skins[Convert.ToInt32(node["skin"])]);
                    var joints = ListOf(skin, "joints");
                    var ibms = ReadMats(accessors, views, file, bin, Convert.ToInt32(skin["inverseBindMatrices"]));
                    pal = new double[joints.Count][];
                    for (int j = 0; j < joints.Count; j++)
                    {
                        var jm = new double[16];
                        Mul(worlds[Convert.ToInt32(joints[j])], ibms[j], jm);
                        pal[j] = jm;
                    }
                }

                var mesh = Dict(meshes[Convert.ToInt32(node["mesh"])]);
                foreach (var primObj in ListOf(mesh, "primitives"))
                {
                    var prim = Dict(primObj);
                    var attrs = Dict(prim["attributes"]);
                    if (!attrs.ContainsKey("POSITION")) continue;
                    var pos = ReadFloats(accessors, views, file, bin, Convert.ToInt32(attrs["POSITION"]), 3);
                    int count = pos.Length / 3;
                    float[] nrm = attrs.ContainsKey("NORMAL")
                        ? ReadFloats(accessors, views, file, bin, Convert.ToInt32(attrs["NORMAL"]), 3)
                        : null;
                    float[] uv = attrs.ContainsKey("TEXCOORD_0")
                        ? ReadFloats(accessors, views, file, bin, Convert.ToInt32(attrs["TEXCOORD_0"]), 2)
                        : null;
                    int[] joints = null;
                    float[] weights = null;
                    if (skinned && attrs.ContainsKey("JOINTS_0") && attrs.ContainsKey("WEIGHTS_0"))
                    {
                        joints = ReadInts(accessors, views, file, bin, Convert.ToInt32(attrs["JOINTS_0"]), 4);
                        weights = ReadFloats(accessors, views, file, bin, Convert.ToInt32(attrs["WEIGHTS_0"]), 4);
                    }

                    int mat = prim.ContainsKey("material") ? Convert.ToInt32(prim["material"]) : 0;
                    int image = ImageForMaterial(materials, textures, mat);
                    usedMats.Add(mat);
                    if (image >= 0 && !imageFiles.ContainsKey(image))
                    {
                        string texName = assetName + "_" + image + ".png";
                        ExtractImage(images, views, file, bin, image, Path.Combine(dir, texName));
                        imageFiles[image] = texName;
                    }

                    sb.Append("usemtl mat").AppendLine(mat.ToString(inv));
                    for (int v = 0; v < count; v++)
                    {
                        double x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
                        double nx = nrm != null ? nrm[v * 3] : 0;
                        double ny = nrm != null ? nrm[v * 3 + 1] : 1;
                        double nz = nrm != null ? nrm[v * 3 + 2] : 0;
                        if (pal != null && joints != null)
                        {
                            double ox = 0, oy = 0, oz = 0, onx = 0, ony = 0, onz = 0, wsum = 0;
                            for (int k = 0; k < 4; k++)
                            {
                                float w = weights[v * 4 + k];
                                if (w <= 0f) continue;
                                int j = joints[v * 4 + k];
                                if (j < 0 || j >= pal.Length) continue;
                                var m = pal[j];
                                ox += w * (m[0] * x + m[4] * y + m[8] * z + m[12]);
                                oy += w * (m[1] * x + m[5] * y + m[9] * z + m[13]);
                                oz += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
                                onx += w * (m[0] * nx + m[4] * ny + m[8] * nz);
                                ony += w * (m[1] * nx + m[5] * ny + m[9] * nz);
                                onz += w * (m[2] * nx + m[6] * ny + m[10] * nz);
                                wsum += w;
                            }
                            if (wsum > 0)
                            {
                                x = ox; y = oy; z = oz; nx = onx; ny = ony; nz = onz;
                            }
                        }
                        else
                        {
                            var m = worlds[ni];
                            double ox = m[0] * x + m[4] * y + m[8] * z + m[12];
                            double oy = m[1] * x + m[5] * y + m[9] * z + m[13];
                            double oz = m[2] * x + m[6] * y + m[10] * z + m[14];
                            double onx = m[0] * nx + m[4] * ny + m[8] * nz;
                            double ony = m[1] * nx + m[5] * ny + m[9] * nz;
                            double onz = m[2] * nx + m[6] * ny + m[10] * nz;
                            x = ox; y = oy; z = oz; nx = onx; ny = ony; nz = onz;
                        }

                        x = -x;
                        nx = -nx;
                        double len = Math.Sqrt(nx * nx + ny * ny + nz * nz);
                        if (len > 1e-8) { nx /= len; ny /= len; nz /= len; }
                        double u = uv != null ? uv[v * 2] : 0;
                        double vv = uv != null ? 1.0 - uv[v * 2 + 1] : 0;

                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

                        sb.Append("v ").Append(x.ToString("0.######", inv)).Append(' ')
                            .Append(y.ToString("0.######", inv)).Append(' ')
                            .Append(z.ToString("0.######", inv)).AppendLine();
                        sb.Append("vt ").Append(u.ToString("0.######", inv)).Append(' ')
                            .Append(vv.ToString("0.######", inv)).AppendLine();
                        sb.Append("vn ").Append(nx.ToString("0.######", inv)).Append(' ')
                            .Append(ny.ToString("0.######", inv)).Append(' ')
                            .Append(nz.ToString("0.######", inv)).AppendLine();
                    }

                    int[] idx = prim.ContainsKey("indices")
                        ? ReadInts(accessors, views, file, bin, Convert.ToInt32(prim["indices"]), 1)
                        : null;
                    int triVerts = idx != null ? idx.Length : count;
                    for (int t = 0; t + 2 < triVerts; t += 3)
                    {
                        int a = vBase + (idx != null ? idx[t] : t);
                        int b = vBase + (idx != null ? idx[t + 1] : t + 1);
                        int c = vBase + (idx != null ? idx[t + 2] : t + 2);
                        sb.Append("f ")
                            .Append(a).Append('/').Append(a).Append('/').Append(a).Append(' ')
                            .Append(c).Append('/').Append(c).Append('/').Append(c).Append(' ')
                            .Append(b).Append('/').Append(b).Append('/').Append(b).AppendLine();
                        triCount++;
                    }
                    vBase += count;
                    vertCount += count;
                }
            }

            if (vertCount == 0) throw new InvalidDataException("No vertices exported from " + glbPath);
            File.WriteAllText(objPath, sb.ToString());

            var mtl = new StringBuilder();
            if (usedMats.Count == 0) usedMats.Add(0);
            foreach (var mat in usedMats)
            {
                int image = ImageForMaterial(materials, textures, mat);
                mtl.Append("newmtl mat").AppendLine(mat.ToString(inv));
                mtl.AppendLine("Kd 1 1 1");
                mtl.AppendLine("d 1");
                mtl.AppendLine("illum 1");
                if (image >= 0 && imageFiles.ContainsKey(image))
                    mtl.Append("map_Kd ").AppendLine(imageFiles[image]);
            }
            File.WriteAllText(Path.ChangeExtension(objPath, ".mtl"), mtl.ToString());

            return string.Format(inv,
                "{0} verts={1} tris={2} min=({3:0.###},{4:0.###},{5:0.###}) max=({6:0.###},{7:0.###},{8:0.###})",
                assetName, vertCount, triCount, minX, minY, minZ, maxX, maxY, maxZ);
        }

        static bool Skip(string name, string[] parts)
        {
            if (parts == null || string.IsNullOrEmpty(name)) return false;
            foreach (var p in parts)
                if (name.IndexOf(p, StringComparison.OrdinalIgnoreCase) >= 0) return true;
            return false;
        }

        static int ImageForMaterial(List<object> materials, List<object> textures, int mat)
        {
            if (mat < 0 || mat >= materials.Count) return -1;
            var m = Dict(materials[mat]);
            if (!m.ContainsKey("pbrMetallicRoughness")) return -1;
            var pbr = Dict(m["pbrMetallicRoughness"]);
            if (!pbr.ContainsKey("baseColorTexture")) return -1;
            var info = Dict(pbr["baseColorTexture"]);
            int tex = Convert.ToInt32(info["index"]);
            if (tex < 0 || tex >= textures.Count) return -1;
            var t = Dict(textures[tex]);
            return t.ContainsKey("source") ? Convert.ToInt32(t["source"]) : -1;
        }

        static void ExtractImage(List<object> images, List<object> views, byte[] file, int bin, int image, string path)
        {
            var img = Dict(images[image]);
            if (!img.ContainsKey("bufferView")) return;
            var view = Dict(views[Convert.ToInt32(img["bufferView"])]);
            int off = view.ContainsKey("byteOffset") ? Convert.ToInt32(view["byteOffset"]) : 0;
            int len = Convert.ToInt32(view["byteLength"]);
            var bytes = new byte[len];
            Buffer.BlockCopy(file, bin + off, bytes, 0, len);
            File.WriteAllBytes(path, bytes);
        }

        static double[] World(int i, List<object> nodes, int[] parents, double[][] cache)
        {
            if (cache[i] != null) return cache[i];
            var local = Local(Dict(nodes[i]));
            if (parents[i] >= 0)
            {
                var w = new double[16];
                Mul(World(parents[i], nodes, parents, cache), local, w);
                cache[i] = w;
            }
            else cache[i] = local;
            return cache[i];
        }

        static double[] Local(Dictionary<string, object> node)
        {
            if (node.ContainsKey("matrix"))
            {
                var list = ListOf(node, "matrix");
                var m = new double[16];
                for (int i = 0; i < 16 && i < list.Count; i++) m[i] = Convert.ToDouble(list[i]);
                return m;
            }
            double tx = 0, ty = 0, tz = 0, qx = 0, qy = 0, qz = 0, qw = 1, sx = 1, sy = 1, sz = 1;
            if (node.ContainsKey("translation"))
            {
                var t = ListOf(node, "translation");
                tx = Convert.ToDouble(t[0]); ty = Convert.ToDouble(t[1]); tz = Convert.ToDouble(t[2]);
            }
            if (node.ContainsKey("rotation"))
            {
                var r = ListOf(node, "rotation");
                qx = Convert.ToDouble(r[0]); qy = Convert.ToDouble(r[1]); qz = Convert.ToDouble(r[2]); qw = Convert.ToDouble(r[3]);
            }
            if (node.ContainsKey("scale"))
            {
                var s = ListOf(node, "scale");
                sx = Convert.ToDouble(s[0]); sy = Convert.ToDouble(s[1]); sz = Convert.ToDouble(s[2]);
            }
            double x2 = qx * qx, y2 = qy * qy, z2 = qz * qz;
            double xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
            return new[]
            {
                (1 - 2 * (y2 + z2)) * sx, (2 * (xy + wz)) * sx, (2 * (xz - wy)) * sx, 0,
                (2 * (xy - wz)) * sy, (1 - 2 * (x2 + z2)) * sy, (2 * (yz + wx)) * sy, 0,
                (2 * (xz + wy)) * sz, (2 * (yz - wx)) * sz, (1 - 2 * (x2 + y2)) * sz, 0,
                tx, ty, tz, 1
            };
        }

        static void Mul(double[] a, double[] b, double[] o)
        {
            for (int c = 0; c < 4; c++)
            for (int r = 0; r < 4; r++)
            {
                double s = 0;
                for (int k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
                o[c * 4 + r] = s;
            }
        }

        static double[][] ReadMats(List<object> accessors, List<object> views, byte[] file, int bin, int accessor)
        {
            var floats = ReadFloats(accessors, views, file, bin, accessor, 16);
            int n = floats.Length / 16;
            var mats = new double[n][];
            for (int i = 0; i < n; i++)
            {
                mats[i] = new double[16];
                for (int k = 0; k < 16; k++) mats[i][k] = floats[i * 16 + k];
            }
            return mats;
        }

        static float[] ReadFloats(List<object> accessors, List<object> views, byte[] file, int bin, int accessor, int expectComps)
        {
            var acc = Dict(accessors[accessor]);
            int count = Convert.ToInt32(acc["count"]);
            int comps = Components(Convert.ToString(acc["type"]));
            if (expectComps > 0 && comps != expectComps)
                throw new InvalidDataException("Accessor component mismatch");
            int compType = Convert.ToInt32(acc["componentType"]);
            int compSize = ComponentSize(compType);
            bool norm = acc.ContainsKey("normalized") && Convert.ToBoolean(acc["normalized"]);
            int accOff = acc.ContainsKey("byteOffset") ? Convert.ToInt32(acc["byteOffset"]) : 0;
            var view = Dict(views[Convert.ToInt32(acc["bufferView"])]);
            int viewOff = view.ContainsKey("byteOffset") ? Convert.ToInt32(view["byteOffset"]) : 0;
            int stride = view.ContainsKey("byteStride") ? Convert.ToInt32(view["byteStride"]) : comps * compSize;
            var data = new float[count * comps];
            int start = bin + viewOff + accOff;
            for (int i = 0; i < count; i++)
            {
                int row = start + i * stride;
                for (int c = 0; c < comps; c++)
                    data[i * comps + c] = ReadComponent(file, row + c * compSize, compType, norm);
            }
            return data;
        }

        static int[] ReadInts(List<object> accessors, List<object> views, byte[] file, int bin, int accessor, int expectComps)
        {
            var floats = ReadFloats(accessors, views, file, bin, accessor, expectComps);
            var ints = new int[floats.Length];
            for (int i = 0; i < floats.Length; i++) ints[i] = (int)floats[i];
            return ints;
        }

        static float ReadComponent(byte[] file, int offset, int compType, bool norm)
        {
            switch (compType)
            {
                case 5120:
                    sbyte sb = (sbyte)file[offset];
                    return norm ? Math.Max(sb / 127f, -1f) : sb;
                case 5121:
                    return norm ? file[offset] / 255f : file[offset];
                case 5122:
                    short s = BitConverter.ToInt16(file, offset);
                    return norm ? Math.Max(s / 32767f, -1f) : s;
                case 5123:
                    ushort us = BitConverter.ToUInt16(file, offset);
                    return norm ? us / 65535f : us;
                case 5125:
                    return BitConverter.ToUInt32(file, offset);
                case 5126:
                    return BitConverter.ToSingle(file, offset);
                default:
                    throw new InvalidDataException("componentType " + compType);
            }
        }

        static int Components(string type)
        {
            switch (type)
            {
                case "SCALAR": return 1;
                case "VEC2": return 2;
                case "VEC3": return 3;
                case "VEC4": return 4;
                case "MAT4": return 16;
                default: throw new InvalidDataException(type);
            }
        }

        static int ComponentSize(int compType)
        {
            switch (compType)
            {
                case 5120:
                case 5121: return 1;
                case 5122:
                case 5123: return 2;
                case 5125:
                case 5126: return 4;
                default: return 4;
            }
        }

        static Dictionary<string, object> Dict(object o)
        {
            return (Dictionary<string, object>)o;
        }

        static List<object> ListOf(Dictionary<string, object> d, string key)
        {
            var raw = d[key];
            var arr = raw as object[];
            if (arr != null) return new List<object>(arr);
            var al = raw as ArrayList;
            if (al != null)
            {
                var list = new List<object>(al.Count);
                foreach (var item in al) list.Add(item);
                return list;
            }
            throw new InvalidDataException("Expected list at " + key);
        }
    }
}
