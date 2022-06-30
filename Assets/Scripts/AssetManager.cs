using System.Collections;
using System.IO;
using UnityEditor;
using UnityEngine;


public class AssetManager : MonoBehaviour
{
    public static AssetManager getInstance;
    void Awake() { getInstance = this; }

    public void LoadAssetBundle(string path, string objectName)
    {
        if (string.IsNullOrEmpty(path))
            return;

        AssetBundle assetBundle = AssetBundle.LoadFromFile(path);
        if (assetBundle == null)
            return;

        GameObject oldObject = GameObject.Find(objectName);
        if (oldObject != null)
            Destroy(oldObject);

        var prefab = assetBundle.LoadAsset<GameObject>(objectName);
        Instantiate(prefab);
    }
}