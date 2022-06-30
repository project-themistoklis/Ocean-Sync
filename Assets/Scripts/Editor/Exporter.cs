using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using System.Diagnostics;

public class Exporter : EditorWindow
{
    [System.Serializable]
    public class UPLOADJSONOBJ
    {
        public string name;
        public string path_lower;
        public string path_display;
        public string id;
    }
    [System.Serializable]
    public class LINKJSONOBJ
    {
        public string url;
        public string id;
    }

    SceneAsset scene = null;
    string nodeJSPath = "NODEJS Path";
    static string webserver_path = "";
    static string webserver_url = "";
    static string assetBundleDirectory = "Assets/AssetBundles";
    static BuildTarget buildTarget = BuildTarget.StandaloneWindows;

    [MenuItem("Custom Tools/Build Asset Bundles")]
    public static void BuildAssetBundles()
    {
        if (!Directory.Exists(assetBundleDirectory))
            Directory.CreateDirectory(assetBundleDirectory);

        BuildPipeline.BuildAssetBundles(assetBundleDirectory, BuildAssetBundleOptions.None, buildTarget);
        foreach (var name in AssetDatabase.GetAllAssetBundleNames())
        {
            UnityEngine.Debug.Log(name);
            AssetDatabase.RemoveAssetBundleName(name, true);
        }
    }

    [MenuItem("Custom Tools/Exporter")]
    public static void Init()
    {
        Exporter window = GetWindow<Exporter>("Exporter");
        window.position = new Rect(0, 0, 250, 80);
        window.Show();
    }

    void OnInspectorUpdate()
    {
        Repaint();
    }

    private void OnGUI()
    {
        scene = (SceneAsset)EditorGUI.ObjectField(new Rect(3, 3, position.width - 6, 20), "Find Dependency", scene, typeof(SceneAsset), true);
        if (scene)
        {
            nodeJSPath = GUI.TextField(new Rect(3, 25, position.width - 6, 20), nodeJSPath);
            if (GUI.Button(new Rect(3, 45, position.width - 3, 20), "Export"))
            {
                string[] assets = new string[1] { AssetDatabase.GetAssetPath(scene) };
                string fileName = GetProjectName() + "_" + GetSceneName(AssetDatabase.GetAssetPath(scene)) + "_" + RandomString(5) + ".unitypackage";
                AssetDatabase.ExportPackage(assets, fileName, ExportPackageOptions.Recurse | ExportPackageOptions.IncludeDependencies);
                File.Copy(fileName, Path.Combine(webserver_path, fileName));
                string data = ExecProcess(nodeJSPath, "Assets/Scripts/Editor/ocean/index.js useLocal=true fileUrl=" + webserver_url + "/" + fileName);
                string[] _data = data.Split('|');

                string objectName = _data[0].Split('=')[1];
                string poolDatatokenAddress = _data[1].Split('=')[1];
                string ddo_id = _data[2].Split('=')[1]; 
                string poolAddress = _data[3].Split('=')[1];
                string ddro_services0_id = _data[4].Split('=')[1];

                P2PConnector.BroadcastNewAssetBundle(objectName, poolDatatokenAddress, ddo_id, poolAddress, ddro_services0_id);
            }
        }
        else
            EditorGUI.LabelField(new Rect(3, 25, position.width - 6, 20), "Missing:", "Select a scene first");
    }

    string GetProjectName()
    {
        string[] s = Application.dataPath.Split('/');
        string projectName = s[s.Length - 2];
        return projectName.Trim();
    }
    string GetSceneName(string scenePath)
    {
        string[] s = scenePath.Split('/');
        string sceneName = s[s.Length - 1];
        return sceneName.Trim();
    }

    public static string RandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return new string(Enumerable.Repeat(chars, length)
            .Select(s => s[new System.Random().Next(s.Length)]).ToArray());
    }

    public static string ExecProcess(string name, string args)
    {
        Process p = new Process();
        p.StartInfo.FileName = name;
        p.StartInfo.Arguments = args;
        p.StartInfo.RedirectStandardOutput = true;
        p.StartInfo.RedirectStandardError = true;
        p.StartInfo.UseShellExecute = false;
        p.Start();

        p.WaitForExit();
        string info = p.StandardOutput.ReadToEnd();
        string error = p.StandardError.ReadToEnd();
        UnityEngine.Debug.Log(info);
        UnityEngine.Debug.Log(error);
        return info;
    }
}