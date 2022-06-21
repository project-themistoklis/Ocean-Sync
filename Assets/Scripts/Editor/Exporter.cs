using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;
using Unity.EditorCoroutines.Editor;
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
    string bearerKey = "Bearer Key";
    string nodeJSPath = "NODEJS Path";

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
            bearerKey = GUI.PasswordField(new Rect(3, 25, position.width - 6, 20), bearerKey, '*');
            nodeJSPath = GUI.TextField(new Rect(3, 45, position.width - 6, 20), nodeJSPath);
            if (GUI.Button(new Rect(3, 65, position.width - 3, 20), "Export"))
            {
                string[] assets = new string[1] { AssetDatabase.GetAssetPath(scene) };
                string fileName = GetProjectName() + "_" + GetSceneName(AssetDatabase.GetAssetPath(scene)) + "_" + RandomString(5) + ".unitypackage";
                AssetDatabase.ExportPackage(assets, fileName, ExportPackageOptions.Recurse | ExportPackageOptions.IncludeDependencies);
                EditorCoroutineUtility.StartCoroutine(Upload(fileName), this);
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

    IEnumerator Upload(string file)
    {
        Dictionary<string, string> postHeader = new Dictionary<string, string>();
        postHeader.Add("Authorization", "Bearer " + bearerKey);
        postHeader.Add("Dropbox-API-Arg", "{\"autorename\":false,\"mode\":\"add\",\"mute\":false,\"path\":\"/test/ " + file + "\",\"strict_conflict\":false}");
        postHeader.Add("Content-Type", "application/octet-stream");
        byte[] myData = File.ReadAllBytes(file);
        using (WWW www = new WWW("https://content.dropboxapi.com/2/files/upload", myData, postHeader))
        {
            yield return www;
            if (www.error != null)
            {
               UnityEngine.Debug.Log(www.error);
            }
            else
            {
                UnityEngine.Debug.Log("Success! " + www.text);
                UPLOADJSONOBJ obj = JsonUtility.FromJson<UPLOADJSONOBJ>(www.text);
                EditorCoroutineUtility.StartCoroutine(GetUrl(obj.path_lower), this);
            }
        }
    }

    IEnumerator GetUrl(string file)
    {
        Dictionary<string, string> postHeader = new Dictionary<string, string>();
        postHeader.Add("Authorization", "Bearer " + bearerKey);
        postHeader.Add("Content-Type", "application/json");
        string body = "{ \"path\": \"" + file + "\" }";
        using (WWW www = new WWW("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", System.Text.Encoding.UTF8.GetBytes(body), postHeader))
        {
            yield return www;
            if (www.error != null)
            {
                UnityEngine.Debug.Log(www.error + " - " + www.text);
            }
            else
            {
                UnityEngine.Debug.Log("Success! " + www.text);
                LINKJSONOBJ obj = JsonUtility.FromJson<LINKJSONOBJ>(www.text);
                ExecProcess(nodeJSPath, "Assets/Scripts/Editor/ocean/index.js useLocal=true fileUrl=" + obj.url);// " + obj.url);
            }
        }
    }

    public static void ExecProcess(string name, string args)
    {
        Process p = new Process();
        UnityEngine.Debug.Log("starting process: " + name + " args:" + args);
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
    }
}