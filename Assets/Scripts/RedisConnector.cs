using FreeRedis;
using UnityEngine;

public class RedisConnector : MonoBehaviour
{
    public static RedisConnector getInstance;
    void Awake() { getInstance = this; }

    [SerializeField] string db_password;
    [SerializeField] string[] hosts;
    [SerializeField] string[] pubsub_channels;

    RedisClient client;

    void Start()
    {
        if (string.IsNullOrEmpty(db_password) || hosts.Length <= 0)
            return;
        
        client = new RedisClient(db_password, hosts, false);

        if (pubsub_channels.Length>0)
        client.Subscribe(pubsub_channels, onpubsub_data);
    }

    void onpubsub_data(string channel, object data)
    {
        Debug.Log("{" + channel + "}: " + data);
    }

    public void Set<T>(string key, T value)
    {
        if (client == null)
            return;

        client.Set(key, value);
    }
    public T Get<T>(string key)
    {
        if (client == null)
            return default;

        return client.Get<T>(key);
    }
}