using FreeRedis;
using UnityEngine;
using LiteNetLib;
using LiteNetLib.Utils;
using System.Collections.Generic;
using System.Collections;
using UnityEngine.Networking;

public class P2PConnector : MonoBehaviour
{
    public static P2PConnector getInstance;
    void Awake() { getInstance = this; }

    [System.Serializable]
    public class ClientData
    {
        public string ip;
        public int port;
        public string connectionKey;
    }

    static List<ClientData> clients = new List<ClientData>() { };
    [SerializeField] int localPort;
    [SerializeField] string localConnectionKey;
    [SerializeField] string nodeJSPath;
    [SerializeField] string saveFilePath;

    EventBasedNetListener listener;
    static NetManager net;

    void Start()
    {
        listener = new EventBasedNetListener();
        net = new NetManager(listener);
        net.Start(localPort);

        listener.ConnectionRequestEvent += ConnectionRequestEvent;
        listener.PeerConnectedEvent += PeerConnectedEvent;
        listener.NetworkReceiveEvent += NetworkReceiveEvent;

        for (int i = 0; i < clients.Count; i++)
            net.Connect(clients[i].ip, clients[i].port, clients[i].connectionKey);
    }

    void Update()
    {
        if (net != null)
            net.PollEvents();
    }

    void ConnectionRequestEvent(ConnectionRequest request)
    {
        if (string.IsNullOrEmpty(localConnectionKey))
            request.Accept();
        else
            request.AcceptIfKey(localConnectionKey);
    }
    void PeerConnectedEvent(NetPeer peer)
    {
        NetDataWriter writer = new NetDataWriter();
        writer.Put((ushort)Packets.Welcome);
        writer.Put(localPort);
        writer.Put(localConnectionKey.Length);
        if (localConnectionKey.Length > 0)
            writer.Put(localConnectionKey);

        SendTo(peer, writer, DeliveryMethod.ReliableOrdered);
    }
    void NetworkReceiveEvent(NetPeer peer, NetPacketReader reader, byte channel, DeliveryMethod deliveryMethod)
    {
        Packets packet = (Packets)reader.GetShort();
        if (packet == Packets.Welcome)
        {
            int port = reader.GetInt();
            int length = reader.GetUShort();
            string connectionKey = "";
            if (length > 0)
                connectionKey = reader.GetString();

            if (!clientAlreadyAdded(peer.EndPoint.Address.ToString(), port, connectionKey))
                net.Connect(peer.EndPoint.Address.ToString(), port, connectionKey);
        }
        else if (packet == Packets.AssetBundle)
        {
            string poolDatatokenAddress = reader.GetString();
            string ddo_id = reader.GetString();
            string poolAddress = reader.GetString();
            string ddro_services0_id = reader.GetString();
            string objectName = reader.GetString();

            string data = ExecProcess(nodeJSPath, "Assets/Scripts/Editor/ocean/buyer.js poolDatatokenAddress=" + poolDatatokenAddress + " ddo_id=" + ddo_id + " poolAddress=" + poolAddress + " ddro_services0_id=" + ddro_services0_id);
            string downloadUrl = data.Split("=")[1];
            string path = saveFilePath + "/" + objectName;
            StartCoroutine(ImportFile(downloadUrl, path, objectName));
        }
    }

    IEnumerator ImportFile(string downloadUrl, string path, string objectName)
    {
        using (UnityWebRequest www = UnityWebRequest.Get(downloadUrl))
        {
            yield return www.Send();
            if (www.isNetworkError || www.isHttpError)
                Debug.Log(www.error);
            else
            {
                System.IO.File.WriteAllBytes(path, www.downloadHandler.data);
                AssetManager.getInstance.LoadAssetBundle(path, objectName);
            }
        }
    }


    public string ExecProcess(string name, string args)
    {
        System.Diagnostics.Process p = new System.Diagnostics.Process();
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
        return info;
    }

    public static void BroadcastNewAssetBundle(string objectName, string poolDatatokenAddress, string ddo_id, string poolAddress, string ddro_services0_id)
    {
        NetDataWriter writer = new NetDataWriter();
        writer.Put((ushort)Packets.AssetBundle);
        writer.Put(poolDatatokenAddress);
        writer.Put(ddo_id);
        writer.Put(poolAddress);
        writer.Put(ddro_services0_id);
        writer.Put(objectName);

        if (net == null)
            net = new NetManager(new EventBasedNetListener());

        for (int i = 0; i < clients.Count; i++)
            net.SendUnconnectedMessage(writer, new System.Net.IPEndPoint(System.Net.IPAddress.Parse(clients[i].ip), clients[i].port));
    }

    bool clientAlreadyAdded(string ip, int port, string connectionKey)
    {
        for (int i = 0; i < clients.Count; i++)
        {
            if (clients[i].ip == ip && clients[i].port == port)
                return true;
        }

        clients.Add(new ClientData()
        {
            ip = ip,
            port = port,
            connectionKey = connectionKey
        });
        return false;
    }

    public void SendTo(NetPeer peer, NetDataWriter writer, DeliveryMethod method)
    {
        peer.Send(writer, method);
    }
    public void Broadcast(NetDataWriter writer, DeliveryMethod method)
    {
        for (int i = 0; i < net.ConnectedPeersCount; i++)
            SendTo(net.ConnectedPeerList[i], writer, method);        
    }
}

public enum Packets
{
    Welcome = 0,
    AssetBundle = 1
}