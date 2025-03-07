#!/bin/bash

# Boxwise SSL Certificate Check Script
# This script checks the status of SSL certificates for the Boxwise domain

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}=== Boxwise SSL Certificate Check ===${NC}"
echo ""

# Function to print status
print_status() {
    local item=$1
    local status=$2
    local details=$3
    
    if [ "$status" == "ok" ]; then
        echo -e "${item}: ${GREEN}OK${NC} ${details}"
    elif [ "$status" == "warning" ]; then
        echo -e "${item}: ${YELLOW}WARNING${NC} ${details}"
    else
        echo -e "${item}: ${RED}ERROR${NC} ${details}"
    fi
}

# Find domain name from Nginx configuration
DOMAIN=""
NGINX_CONF_FILE=""
for conf in /etc/nginx/sites-enabled/*; do
    if grep -q "boxwise" "$conf" 2>/dev/null; then
        DOMAIN=$(grep -E "^\s*server_name" "$conf" 2>/dev/null | head -n 1 | sed -E 's/^\s*server_name\s+([^;]+);.*/\1/' | awk '{print $1}')
        NGINX_CONF_FILE="$conf"
        break
    fi
done

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Could not find domain name in Nginx configuration${NC}"
    echo "Please check your Nginx configuration files in /etc/nginx/sites-enabled/"
    exit 1
fi

echo -e "${BLUE}Domain: ${NC}$DOMAIN"
echo ""

# Check if Nginx is configured for SSL
echo -e "${BLUE}Checking Nginx SSL configuration...${NC}"
if [ -f "$NGINX_CONF_FILE" ]; then
    if grep -q "ssl_certificate" "$NGINX_CONF_FILE"; then
        print_status "Nginx SSL Config" "ok" "(SSL is configured in Nginx)"
        
        # Extract SSL certificate path
        SSL_CERT_PATH=$(grep -E "^\s*ssl_certificate " "$NGINX_CONF_FILE" | sed -E 's/^\s*ssl_certificate\s+([^;]+);.*/\1/')
        
        if [ -n "$SSL_CERT_PATH" ] && [ -f "$SSL_CERT_PATH" ]; then
            print_status "SSL Certificate" "ok" "(Found at $SSL_CERT_PATH)"
            
            # Check certificate expiration
            if command -v openssl &> /dev/null; then
                CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT_PATH" | cut -d= -f2)
                CERT_EXPIRY_SECONDS=$(date -d "$CERT_EXPIRY" +%s)
                CURRENT_SECONDS=$(date +%s)
                SECONDS_LEFT=$((CERT_EXPIRY_SECONDS - CURRENT_SECONDS))
                DAYS_LEFT=$((SECONDS_LEFT / 86400))
                
                if [ $DAYS_LEFT -lt 0 ]; then
                    print_status "Certificate Expiry" "error" "(Certificate EXPIRED $((DAYS_LEFT * -1)) days ago)"
                elif [ $DAYS_LEFT -lt 7 ]; then
                    print_status "Certificate Expiry" "warning" "(Certificate will expire in $DAYS_LEFT days)"
                else
                    print_status "Certificate Expiry" "ok" "(Certificate valid for $DAYS_LEFT more days)"
                fi
                
                # Check certificate issuer
                CERT_ISSUER=$(openssl x509 -issuer -noout -in "$SSL_CERT_PATH" | sed -E 's/.*CN\s*=\s*([^,]*).*/\1/')
                if [[ "$CERT_ISSUER" == *"Let's Encrypt"* ]]; then
                    print_status "Certificate Issuer" "ok" "(Issued by Let's Encrypt)"
                else
                    print_status "Certificate Issuer" "ok" "(Issued by $CERT_ISSUER)"
                fi
            else
                print_status "Certificate Check" "warning" "(openssl command not available)"
            fi
        else
            print_status "SSL Certificate" "error" "(Certificate file not found at $SSL_CERT_PATH)"
        fi
    else
        print_status "Nginx SSL Config" "error" "(SSL is NOT configured in Nginx)"
        echo -e "\n${YELLOW}To set up SSL with Let's Encrypt, run:${NC}"
        echo -e "  ./deploy.sh -d $DOMAIN -e your@email.com -l"
    fi
else
    print_status "Nginx Config" "error" "(Nginx configuration file not found)"
fi
echo ""

# Check if port 443 is open
echo -e "${BLUE}Checking if HTTPS port (443) is open...${NC}"
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":443 "; then
        print_status "HTTPS Port" "ok" "(Port 443 is open and listening)"
    else
        print_status "HTTPS Port" "error" "(Port 443 is NOT open)"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":443 "; then
        print_status "HTTPS Port" "ok" "(Port 443 is open and listening)"
    else
        print_status "HTTPS Port" "error" "(Port 443 is NOT open)"
    fi
else
    print_status "HTTPS Port Check" "warning" "(netstat/ss command not available)"
fi
echo ""

# Check if certbot is installed
echo -e "${BLUE}Checking Let's Encrypt tools...${NC}"
if command -v certbot &> /dev/null; then
    print_status "Certbot" "ok" "(Certbot is installed)"
    
    # Check certbot certificates
    echo -e "\n${BLUE}Checking Let's Encrypt certificates...${NC}"
    CERTBOT_OUTPUT=$(sudo certbot certificates 2>&1)
    
    if echo "$CERTBOT_OUTPUT" | grep -q "No certificates found"; then
        print_status "Let's Encrypt Certs" "error" "(No certificates found)"
        echo -e "\n${YELLOW}To set up SSL with Let's Encrypt, run:${NC}"
        echo -e "  ./deploy.sh -d $DOMAIN -e your@email.com -l"
    elif echo "$CERTBOT_OUTPUT" | grep -q "$DOMAIN"; then
        print_status "Let's Encrypt Certs" "ok" "(Certificate found for $DOMAIN)"
        
        # Extract expiry date
        EXPIRY_DATE=$(echo "$CERTBOT_OUTPUT" | grep "Expiry Date" | head -n 1 | sed -E 's/.*Expiry Date: ([^)]*).*/\1/')
        if [ -n "$EXPIRY_DATE" ]; then
            print_status "Let's Encrypt Expiry" "ok" "($EXPIRY_DATE)"
        fi
    else
        print_status "Let's Encrypt Certs" "warning" "(No certificate found for $DOMAIN)"
        echo -e "\n${YELLOW}To set up SSL with Let's Encrypt, run:${NC}"
        echo -e "  ./deploy.sh -d $DOMAIN -e your@email.com -l"
    fi
else
    print_status "Certbot" "error" "(Certbot is NOT installed)"
    echo -e "\n${YELLOW}To install Certbot and set up SSL, run:${NC}"
    echo -e "  ./deploy.sh -d $DOMAIN -e your@email.com -i -l"
fi
echo ""

# Check DNS resolution
echo -e "${BLUE}Checking DNS resolution...${NC}"
if command -v dig &> /dev/null; then
    IP_FROM_DNS=$(dig +short "$DOMAIN" | head -n 1)
    if [ -n "$IP_FROM_DNS" ]; then
        print_status "DNS Resolution" "ok" "($DOMAIN resolves to $IP_FROM_DNS)"
        
        # Check if the resolved IP matches the server's IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
        if [ "$IP_FROM_DNS" == "$SERVER_IP" ]; then
            print_status "DNS Match" "ok" "(DNS points to this server: $SERVER_IP)"
        else
            print_status "DNS Match" "error" "(DNS points to $IP_FROM_DNS, but this server is $SERVER_IP)"
            echo -e "\n${YELLOW}The domain $DOMAIN is not pointing to this server.${NC}"
            echo "Please update your DNS settings to point to this server's IP address: $SERVER_IP"
        fi
    else
        print_status "DNS Resolution" "error" "($DOMAIN does not resolve to any IP address)"
        echo -e "\n${YELLOW}The domain $DOMAIN is not configured in DNS.${NC}"
        echo "Please set up an A record for $DOMAIN pointing to this server's IP address."
    fi
elif command -v host &> /dev/null; then
    HOST_OUTPUT=$(host "$DOMAIN")
    if echo "$HOST_OUTPUT" | grep -q "has address"; then
        IP_FROM_DNS=$(echo "$HOST_OUTPUT" | grep "has address" | head -n 1 | awk '{print $NF}')
        print_status "DNS Resolution" "ok" "($DOMAIN resolves to $IP_FROM_DNS)"
        
        # Check if the resolved IP matches the server's IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
        if [ "$IP_FROM_DNS" == "$SERVER_IP" ]; then
            print_status "DNS Match" "ok" "(DNS points to this server: $SERVER_IP)"
        else
            print_status "DNS Match" "error" "(DNS points to $IP_FROM_DNS, but this server is $SERVER_IP)"
            echo -e "\n${YELLOW}The domain $DOMAIN is not pointing to this server.${NC}"
            echo "Please update your DNS settings to point to this server's IP address: $SERVER_IP"
        fi
    else
        print_status "DNS Resolution" "error" "($DOMAIN does not resolve to any IP address)"
        echo -e "\n${YELLOW}The domain $DOMAIN is not configured in DNS.${NC}"
        echo "Please set up an A record for $DOMAIN pointing to this server's IP address."
    fi
else
    print_status "DNS Check" "warning" "(dig/host command not available)"
fi
echo ""

# Summary and recommendations
echo -e "${BLUE}=== Summary and Recommendations ===${NC}"
echo ""

if grep -q "ssl_certificate" "$NGINX_CONF_FILE" && [ -f "$SSL_CERT_PATH" ]; then
    if [ $DAYS_LEFT -lt 0 ]; then
        echo -e "${RED}Your SSL certificate has expired.${NC}"
        echo -e "To renew your Let's Encrypt certificate, run:"
        echo -e "  sudo certbot renew"
    elif [ $DAYS_LEFT -lt 7 ]; then
        echo -e "${YELLOW}Your SSL certificate will expire soon.${NC}"
        echo -e "To renew your Let's Encrypt certificate, run:"
        echo -e "  sudo certbot renew"
    else
        echo -e "${GREEN}Your SSL certificate is valid and properly configured.${NC}"
    fi
else
    echo -e "${RED}SSL is not properly configured for your domain.${NC}"
    echo -e "To set up SSL with Let's Encrypt, run:"
    echo -e "  ./deploy.sh -d $DOMAIN -e your@email.com -l"
fi

if [ "$IP_FROM_DNS" != "$SERVER_IP" ]; then
    echo -e "\n${YELLOW}DNS issue detected:${NC} Your domain is not pointing to this server."
    echo -e "Update your DNS settings to point $DOMAIN to $SERVER_IP"
fi

echo ""
echo -e "${BLUE}For more information about Let's Encrypt, visit:${NC}"
echo "https://letsencrypt.org/docs/"
echo ""
